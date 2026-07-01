import { type Context } from 'grammy';
import { getLogger } from '../utils/logger.js';
import { getAIService } from '../ai/nvidia.js';
import { getDatabase } from '../database/index.js';
import { getSessionManager } from '../services/session.js';
import { TELEGRAM_MESSAGE_LIMIT, TYPING_INTERVAL_MS } from '../constants/index.js';
import { type BotContext } from '../types/context.js';

const logger = getLogger();

export async function handleAIChat(ctx: Context): Promise<void> {
  const msg = ctx.message || ctx.editedMessage;
  if (!msg || !msg.text) return;

  const botCtx = ctx as BotContext;
  const user = botCtx.dbUser;
  const dbChat = botCtx.dbChat;

  if (!user || !dbChat) return;

  const text = msg.text;
  const chatId = dbChat.id;
  const telegramChatId = dbChat.telegramId;

  if (msg.chat.type !== 'private') {
    const botMentioned = text.includes('@') && text.includes(ctx.me?.id?.toString() || '');
    const isReply = msg.reply_to_message?.from?.id === ctx.me?.id;
    if (!botMentioned && !isReply && !text.startsWith('/')) return;
  }

  if (text.startsWith('/')) return;

  try {
    const ai = getAIService();
    const db = getDatabase();
    const sessionManager = getSessionManager();

    await db.saveMessage(user.id, chatId, 'user', text, null, telegramChatId, msg.from?.id || null, msg.message_id);
    await db.incrementUserMessageCount(user.id);
    await db.incrementChatMessageCount(chatId);

    let settings = await db.getUserSettings(user.id);
    if (!settings) {
      settings = await db.createUserSettings(user.id);
    }

    if (!settings.isEnabled) {
      await ctx.reply('AI responses are currently disabled for your account.');
      return;
    }

    const context = await sessionManager.getContext(user.id, chatId);
    context.push({ role: 'user', content: text });

    const typingInterval = setInterval(() => {
      ctx.api.sendChatAction(msg.chat.id, 'typing').catch(() => {});
    }, TYPING_INTERVAL_MS);

    try {
      const response = await ai.chat({
        messages: context,
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      });

      clearInterval(typingInterval);

      await sessionManager.addMessage(user.id, chatId, 'user', text, response.usage.promptTokens);
      await sessionManager.addMessage(user.id, chatId, 'assistant', response.content, response.usage.completionTokens);

      await db.saveMessage(
        user.id, chatId, 'assistant', response.content, response.usage.totalTokens,
        telegramChatId, null, null,
      );

      const replyContent = response.content.length > TELEGRAM_MESSAGE_LIMIT
        ? response.content.substring(0, TELEGRAM_MESSAGE_LIMIT - 100) + '\n\n*(truncated)*'
        : response.content;

      await ctx.reply(replyContent, {
        parse_mode: 'Markdown',
        reply_parameters: msg.message_id ? { message_id: msg.message_id } : undefined,
      });

      logger.debug('AI response sent', {
        userId: user.id,
        chatId,
        latency: response.latency,
        tokens: response.usage.totalTokens,
      });
    } catch (error) {
      clearInterval(typingInterval);
      throw error;
    }
  } catch (error) {
    logger.error('AI chat error', {
      error: (error as Error).message,
      userId: user.id,
      chatId,
    });

    await ctx.reply(
      'Sorry, I encountered an error processing your request. Please try again later.',
    );
  }
}
