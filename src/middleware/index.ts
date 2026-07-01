import { type Context, type NextFunction } from 'grammy';
import { getLogger } from '../utils/logger.js';
import { getDatabase } from '../database/index.js';
import { getEnv } from '../config/env.js';
import { ERROR_MESSAGES } from '../constants/index.js';
import { v4 as uuidv4 } from 'uuid';
import { type BotContext } from '../types/context.js';

const logger = getLogger();

export async function requestIdMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  (ctx as BotContext).requestId = uuidv4();
  await next();
}

export async function userMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  try {
    const msg = ctx.message || ctx.editedMessage;
    if (!msg) {
      await next();
      return;
    }

    const from = msg.from;
    if (!from || from.is_bot) {
      await next();
      return;
    }

    const db = getDatabase();
    let user = await db.getUser(from.id);

    if (!user) {
      user = await db.createUser(from.id, from.username || null, from.first_name, from.last_name || null, from.language_code || null);
      logger.info('New user registered', { telegramId: from.id, username: from.username });
    }

    if (user.isBlocked) {
      await ctx.reply('You are blocked from using this bot.');
      return;
    }

    await db.updateUserActivity(user.id);

    const adminIds = (getEnv().ADMIN_IDS || '').split(',').map(Number).filter(Boolean);
    if (adminIds.includes(from.id) && !user.isAdmin) {
      await db.createUserSettings(user.id);
    }

    (ctx as BotContext).dbUser = user;
    await next();
  } catch (error) {
    logger.error('User middleware error', { error: (error as Error).message });
    await next();
  }
}

export async function chatMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  try {
    const msg = ctx.message || ctx.editedMessage;
    if (!msg) {
      await next();
      return;
    }

    const chat = msg.chat;
    const db = getDatabase();

    let dbChat = await db.getChat(chat.id);
    if (!dbChat) {
      dbChat = await db.createChat(chat.id, chat.type, chat.title || null, chat.username || null, chat.first_name || null, chat.last_name || null);
      logger.info('New chat registered', { telegramId: chat.id, type: chat.type });
    }

    await db.updateChatActivity(dbChat.id);
    (ctx as BotContext).dbChat = { id: dbChat.id, telegramId: Number(dbChat.telegramId) };
    await next();
  } catch (error) {
    logger.error('Chat middleware error', { error: (error as Error).message });
    await next();
  }
}

export async function rateLimitMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  const cache = new Map<number, number[]>();
  const maxRequests = getEnv().RATE_LIMIT_MAX;
  const windowMs = getEnv().RATE_LIMIT_WINDOW_MS;

  const userId = ctx.from?.id;
  if (!userId) {
    await next();
    return;
  }

  const now = Date.now();
  const timestamps = cache.get(userId) || [];
  const recent = timestamps.filter(t => now - t < windowMs);

  if (recent.length >= maxRequests) {
    await ctx.reply(ERROR_MESSAGES.RATE_LIMITED);
    return;
  }

  recent.push(now);
  cache.set(userId, recent);

  if (cache.size > 10000) {
    const threshold = now - windowMs;
    for (const [id, times] of cache) {
      cache.set(id, times.filter(t => now - t < threshold));
      if (cache.get(id)!.length === 0) cache.delete(id);
    }
  }

  await next();
}

export async function errorBoundaryMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  try {
    await next();
  } catch (error) {
    const err = error as Error;
    logger.error('Unhandled error in handler', {
      error: err.message,
      stack: err.stack,
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
    });

    try {
      await ctx.reply(ERROR_MESSAGES.GENERIC);
    } catch {
      // ignore reply errors
    }
  }
}
