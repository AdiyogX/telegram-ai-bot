import { type Context } from 'grammy';
import { getDatabase } from '../database/index.js';
import { getSessionManager } from '../services/session.js';
import { BOT_VERSION, BOT_NAME, COMMAND_DESCRIPTIONS } from '../constants/index.js';
import { type BotContext } from '../types/context.js';

export async function startCommand(ctx: Context): Promise<void> {
  const user = (ctx as BotContext).dbUser;
  const name = user?.firstName || 'there';

  await ctx.reply(
    `👋 Hello *${name}!*\n\n` +
    `I'm *${BOT_NAME}*, powered by NVIDIA AI.\n\n` +
    `I can help you with:\n` +
    `• Answering questions\n` +
    `• Natural conversations\n` +
    `• Information & research\n` +
    `• And much more!\n\n` +
    `Send me a message anytime or use /help to see all commands.`,
    { parse_mode: 'Markdown' },
  );
}

export async function helpCommand(ctx: Context): Promise<void> {
  const commands = Object.entries(COMMAND_DESCRIPTIONS)
    .map(([cmd, desc]) => `/${cmd} - ${desc}`)
    .join('\n');

  await ctx.reply(
    `*Available Commands*\n\n${commands}\n\n` +
    `*Tips:*\n` +
    `• Send any message for AI reply\n` +
    `• Use /reset to clear conversation\n` +
    `• Works in groups when mentioned`,
    { parse_mode: 'Markdown' },
  );
}

export async function resetCommand(ctx: Context): Promise<void> {
  const user = (ctx as BotContext).dbUser;
  const chatId = ctx.chat?.id;

  if (user && chatId) {
    await getSessionManager().resetSession(user.id, chatId);
    await ctx.reply('✅ Conversation history has been reset. Let\'s start fresh!');
  } else {
    await ctx.reply('Could not reset conversation. Please try again.');
  }
}

export async function pingCommand(ctx: Context): Promise<void> {
  const start = Date.now();
  const msg = await ctx.reply('🏓 Pong!');
  const latency = Date.now() - start;
  await ctx.api.editMessageText(msg.chat.id, msg.message_id, `🏓 Pong! \`${latency}ms\``, { parse_mode: 'Markdown' });
}

export async function statsCommand(ctx: Context): Promise<void> {
  const user = (ctx as BotContext).dbUser;
  if (!user) {
    await ctx.reply('Could not retrieve your stats.');
    return;
  }

  const db = getDatabase();
  const settings = await db.getUserSettings(user.id);

  const message = [
    `*Your Stats*`,
    ``,
    `📊 Total messages: \`${user.totalMessages}\``,
    `🤖 Model: \`${settings?.model || 'default'}\``,
    `🌡️ Temperature: \`${settings?.temperature ?? 0.7}\``,
    `📝 Max tokens: \`${settings?.maxTokens ?? 1024}\``,
    `📅 Joined: \`${user.createdAt}\``,
  ].join('\n');

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function aboutCommand(ctx: Context): Promise<void> {
  const db = getDatabase();
  const totalUsers = await db.getTotalUsers();
  const totalMessages = await db.getTotalMessages();
  const activeSessions = await db.getActiveSessions();

  const message = [
    `*${BOT_NAME}*`,
    `Version: \`${BOT_VERSION}\``,
    ``,
    `*Statistics:*`,
    `👥 Users: \`${totalUsers}\``,
    `💬 Messages: \`${totalMessages}\``,
    `🔄 Active sessions: \`${activeSessions}\``,
    ``,
    `⚡ Powered by NVIDIA AI`,
    `🔧 Built with grammY + TypeScript`,
  ].join('\n');

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function settingsCommand(ctx: Context): Promise<void> {
  const user = (ctx as BotContext).dbUser;
  if (!user) {
    await ctx.reply('Could not retrieve settings.');
    return;
  }

  const db = getDatabase();
  let settings = await db.getUserSettings(user.id);
  if (!settings) {
    settings = await db.createUserSettings(user.id);
  }

  const kb = {
    inline_keyboard: [
      [
        { text: '🤖 Change Model', callback_data: 'settings:model' },
        { text: '🌡️ Temperature', callback_data: 'settings:temperature' },
      ],
      [
        { text: '📝 Max Tokens', callback_data: 'settings:maxtokens' },
        { text: '🔄 Reset Settings', callback_data: 'settings:reset' },
      ],
    ],
  };

  await ctx.reply(
    `*Settings*\n\n` +
    `Model: \`${settings.model}\`\n` +
    `Temperature: \`${settings.temperature}\`\n` +
    `Max tokens: \`${settings.maxTokens}\`\n` +
    `Enabled: \`${settings.isEnabled ? 'Yes' : 'No'}\``,
    { parse_mode: 'Markdown', reply_markup: kb },
  );
}

export async function adminCommand(ctx: Context): Promise<void> {
  const user = (ctx as BotContext).dbUser;
  if (!user?.isAdmin) {
    await ctx.reply('You do not have permission to use this command.');
    return;
  }

  const db = getDatabase();
  const totalUsers = await db.getTotalUsers();
  const totalMessages = await db.getTotalMessages();
  const activeSessions = await db.getActiveSessions();

  const message = [
    `*Admin Panel*`,
    ``,
    `👥 Total users: \`${totalUsers}\``,
    `💬 Total messages: \`${totalMessages}\``,
    `🔄 Active sessions: \`${activeSessions}\``,
    ``,
    `*System*`,
    `💾 Memory: \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\``,
    `⏱️ Uptime: \`${Math.floor(process.uptime())}s\``,
  ].join('\n');

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
