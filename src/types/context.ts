import { type Context } from 'grammy';
import { type User } from './index.js';

export interface BotContext extends Context {
  dbUser?: User;
  dbChat?: { id: number; telegramId: number };
  requestId?: string;
}
