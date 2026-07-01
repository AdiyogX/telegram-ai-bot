import { Bot, webhookCallback } from 'grammy';
import { loadEnv, getEnv, ensureDataDir } from './config/env.js';
import { getLogger } from './utils/logger.js';
import { getDatabase } from './database/index.js';
import { getAIService } from './ai/nvidia.js';
import { getSessionManager } from './services/session.js';
import { getMCPManager } from './mcp/index.js';
import { getBrowserAutomation } from './browser/index.js';
import { startServer } from './server/index.js';
import {
  requestIdMiddleware,
  userMiddleware,
  chatMiddleware,
  rateLimitMiddleware,
  errorBoundaryMiddleware,
} from './middleware/index.js';
import {
  startCommand,
  helpCommand,
  resetCommand,
  pingCommand,
  statsCommand,
  aboutCommand,
  settingsCommand,
  adminCommand,
} from './handlers/commands.js';
import { handleAIChat } from './handlers/ai.js';
import { handleCallbackQuery } from './handlers/callbacks.js';
import { COMMANDS, BOT_VERSION, CLEANUP_INTERVAL_MS } from './constants/index.js';

const logger = getLogger();

export class TelegramAIBot {
  private bot!: Bot;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  async initialize(): Promise<void> {
    loadEnv();
    ensureDataDir();

    logger.info('Initializing Telegram AI Bot', { version: BOT_VERSION });

    const db = getDatabase();
    await db.initialize();
    logger.info('Database initialized');

    const ai = getAIService();
    const aiAvailable = await ai.isAvailable();
    logger.info(`AI service ${aiAvailable ? 'available' : 'unavailable (will retry on demand)'}`);

    getSessionManager();
    getMCPManager();
    getBrowserAutomation();

    this.bot = new Bot(getEnv().TELEGRAM_BOT_TOKEN);
    this.registerMiddleware();
    this.registerCommands();
    this.registerHandlers();
    this.registerErrorHandler();

    this.startCleanupJob();
    logger.info('Bot initialization complete');
  }

  private registerMiddleware(): void {
    this.bot.use(errorBoundaryMiddleware);
    this.bot.use(requestIdMiddleware);
    this.bot.use(rateLimitMiddleware);
    this.bot.use(userMiddleware);
    this.bot.use(chatMiddleware);
  }

  private registerCommands(): void {
    this.bot.command(COMMANDS.START, startCommand);
    this.bot.command(COMMANDS.HELP, helpCommand);
    this.bot.command(COMMANDS.RESET, resetCommand);
    this.bot.command(COMMANDS.PING, pingCommand);
    this.bot.command(COMMANDS.STATS, statsCommand);
    this.bot.command(COMMANDS.ABOUT, aboutCommand);
    this.bot.command(COMMANDS.SETTINGS, settingsCommand);
    this.bot.command(COMMANDS.ADMIN, adminCommand);
  }

  private registerHandlers(): void {
    this.bot.on('message:text', handleAIChat);
    this.bot.on('callback_query:data', handleCallbackQuery);
  }

  private registerErrorHandler(): void {
    this.bot.catch((error) => {
      const ctx = error.ctx;
      const e = error.error;
      logger.error('Bot error caught', {
        error: e instanceof Error ? e.message : String(e),
        updateId: ctx?.update?.update_id,
      });
    });
  }

  async startPolling(): Promise<void> {
    logger.info('Starting bot in polling mode');
    await this.bot.start({
      onStart: (info) => {
        logger.info(`Bot started as @${info.username}`, { username: info.username });
      },
      drop_pending_updates: true,
    });
  }

  async setWebhook(url: string, secret?: string): Promise<void> {
    logger.info(`Setting webhook to: ${url}`);
    await this.bot.api.setWebhook(url, {
      secret_token: secret,
      allowed_updates: ['message', 'callback_query', 'edited_message'],
    });
    const info = await this.bot.api.getWebhookInfo();
    logger.info('Webhook configured', { url: info.url, pending: info.pending_update_count });
  }

  getWebhookCallback() {
    return webhookCallback(this.bot, 'fastify', {
      secretToken: getEnv().WEBHOOK_SECRET,
      timeoutMilliseconds: 30000,
    });
  }

  private startCleanupJob(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const db = getDatabase();
        await db.cleanupSessions();
        logger.debug('Session cleanup completed');
      } catch (error) {
        logger.error('Session cleanup failed', { error: (error as Error).message });
      }
    }, CLEANUP_INTERVAL_MS);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down bot...');
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    try {
      await this.bot.stop();
    } catch {
      // ignore stop errors
    }
    try {
      const db = getDatabase();
      await db.close();
    } catch {
      // ignore db close errors
    }
    logger.info('Bot shutdown complete');
  }
}

async function main() {
  const telegramBot = new TelegramAIBot();
  await telegramBot.initialize();

  const server = await startServer();

  const env = getEnv();

  if (env.WEBHOOK_URL) {
    const webhookUrl = `${env.WEBHOOK_URL}/webhook`;
    await telegramBot.setWebhook(webhookUrl, env.WEBHOOK_SECRET);
    server.post('/webhook', telegramBot.getWebhookCallback());
    logger.info(`Webhook mode: ${webhookUrl}`);
  } else {
    logger.info('Polling mode (no WEBHOOK_URL configured)');
    telegramBot.startPolling().catch((err) => {
      logger.fatal('Polling failed', { error: (err as Error).message });
      process.exit(1);
    });
  }

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down...`);
      await telegramBot.shutdown();
      process.exit(0);
    });
  }

  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { error: String(reason) });
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
