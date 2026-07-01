import { type Context } from 'grammy';
import { getDatabase } from '../database/index.js';
import { getLogger } from '../utils/logger.js';
import { type BotContext } from '../types/context.js';

const logger = getLogger();

export async function handleCallbackQuery(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery || !ctx.callbackQuery.data) return;

  const user = (ctx as BotContext).dbUser;
  if (!user) return;

  const data = ctx.callbackQuery.data;
  const db = getDatabase();

  try {
    if (data === 'settings:model') {
      const kb = {
        inline_keyboard: [
          [{ text: 'Llama 3.1 8B', callback_data: 'model:meta/llama-3.1-8b-instruct' }],
          [{ text: 'Llama 3.1 70B', callback_data: 'model:meta/llama-3.1-70b-instruct' }],
          [{ text: 'Mistral 7B', callback_data: 'model:mistralai/mistral-7b-instruct-v0.3' }],
          [{ text: 'Mixtral 8x7B', callback_data: 'model:mistralai/mixtral-8x7b-instruct-v0.1' }],
          [{ text: '◀️ Back', callback_data: 'settings:back' }],
        ],
      };
      await ctx.editMessageText('*Choose a model*\n\nSelect the AI model for your conversations:', {
        parse_mode: 'Markdown',
        reply_markup: kb,
      });
    } else if (data.startsWith('model:')) {
      const model = data.replace('model:', '');
      await db.updateUserSettings(user.id, { model } as Record<string, unknown>);
      await ctx.editMessageText(`✅ Model set to \`${model}\``, { parse_mode: 'Markdown' });
    } else if (data === 'settings:temperature') {
      const kb = {
        inline_keyboard: [
          [
            { text: '❄️ Precise (0.2)', callback_data: 'temp:0.2' },
            { text: '⚖️ Balanced (0.7)', callback_data: 'temp:0.7' },
          ],
          [
            { text: '🎨 Creative (1.0)', callback_data: 'temp:1.0' },
            { text: '🌈 Very Creative (1.5)', callback_data: 'temp:1.5' },
          ],
          [{ text: '◀️ Back', callback_data: 'settings:back' }],
        ],
      };
      await ctx.editMessageText('*Choose Temperature*\n\nLower = precise, Higher = creative:', {
        parse_mode: 'Markdown',
        reply_markup: kb,
      });
    } else if (data.startsWith('temp:')) {
      const temp = parseFloat(data.replace('temp:', ''));
      await db.updateUserSettings(user.id, { temperature: temp });
      await ctx.editMessageText(`✅ Temperature set to \`${temp}\``, { parse_mode: 'Markdown' });
    } else if (data === 'settings:maxtokens') {
      const kb = {
        inline_keyboard: [
          [{ text: '256', callback_data: 'maxtokens:256' }],
          [{ text: '512', callback_data: 'maxtokens:512' }],
          [{ text: '1024', callback_data: 'maxtokens:1024' }],
          [{ text: '2048', callback_data: 'maxtokens:2048' }],
          [{ text: '◀️ Back', callback_data: 'settings:back' }],
        ],
      };
      await ctx.editMessageText('*Max Tokens*\n\nMaximum response length:', {
        parse_mode: 'Markdown',
        reply_markup: kb,
      });
    } else if (data.startsWith('maxtokens:')) {
      const tokens = parseInt(data.replace('maxtokens:', ''), 10);
      await db.updateUserSettings(user.id, { maxTokens: tokens } as Record<string, unknown>);
      await ctx.editMessageText(`✅ Max tokens set to \`${tokens}\``, { parse_mode: 'Markdown' });
    } else if (data === 'settings:reset') {
      await db.updateUserSettings(user.id, {
        model: 'meta/llama-3.1-8b-instruct',
        temperature: 0.7,
        maxTokens: 1024,
      } as Record<string, unknown>);
      await ctx.editMessageText('✅ Settings reset to defaults.', { parse_mode: 'Markdown' });
    } else if (data === 'settings:back') {
      await ctx.editMessageText('Settings updated. Use /settings to view current settings.');
    }

    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Callback query error', { error: (error as Error).message, data });
    await ctx.answerCallbackQuery('An error occurred. Please try again.');
  }
}
