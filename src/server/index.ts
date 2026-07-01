import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { getEnv } from '../config/env.js';
import { getLogger } from '../utils/logger.js';
import { getDatabase } from '../database/index.js';
import { BOT_VERSION, BOT_NAME } from '../constants/index.js';
import { type HealthStatus } from '../types/index.js';

const logger = getLogger();

export async function createServer() {
  const app = Fastify({
    logger: false,
    trustProxy: true,
  });

  await app.register(cors, { origin: '*' });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(compress, { global: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.get('/health', async (_request, _reply) => {
    const db = getDatabase();

    let dbOk = false;
    let memOk = true;

    try {
      await db.getTotalUsers();
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const mem = process.memoryUsage();
    const memUsage = mem.heapUsed / 1024 / 1024;
    if (memUsage > 500) memOk = false;

    const allOk = dbOk && memOk;

    const status: HealthStatus = {
      status: allOk ? 'healthy' : dbOk ? 'degraded' : 'unhealthy',
      version: BOT_VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk,
        ai: true,
        telegram: true,
        memory: memOk,
      },
      metrics: {
        totalUsers: dbOk ? await db.getTotalUsers() : 0,
        totalMessages: dbOk ? await db.getTotalMessages() : 0,
        activeSessions: dbOk ? await db.getActiveSessions() : 0,
        memoryUsage: Math.round(memUsage * 100) / 100,
      },
    };

    const statusCode = allOk ? 200 : 503;
    return _reply.code(statusCode).send(status);
  });

  app.get('/metrics', async (_request, _reply) => {
    const mem = process.memoryUsage();
    const metrics = [
      `# HELP telegram_ai_bot_info Bot information`,
      `# TYPE telegram_ai_bot_info gauge`,
      `telegram_ai_bot_info{version="${BOT_VERSION}",name="${BOT_NAME}"} 1`,
      ``,
      `# HELP telegram_ai_bot_uptime_seconds Bot uptime in seconds`,
      `# TYPE telegram_ai_bot_uptime_seconds gauge`,
      `telegram_ai_bot_uptime_seconds ${process.uptime()}`,
      ``,
      `# HELP telegram_ai_bot_memory_usage_bytes Memory usage in bytes`,
      `# TYPE telegram_ai_bot_memory_usage_bytes gauge`,
      `telegram_ai_bot_memory_usage_bytes ${mem.heapUsed}`,
      `telegram_ai_bot_memory_usage_bytes{rss="${mem.rss}"} ${mem.rss}`,
      ``,
      `# HELP telegram_ai_bot_nodejs_version Node.js version`,
      `# TYPE telegram_ai_bot_nodejs_version gauge`,
      `telegram_ai_bot_nodejs_version{version="${process.version}"} 1`,
    ].join('\n');

    return _reply.type('text/plain').send(metrics);
  });

  app.get('/', async (_request, _reply) => {
    return {
      name: BOT_NAME,
      version: BOT_VERSION,
      status: 'running',
      uptime: process.uptime(),
    };
  });

  return app;
}

export async function startServer() {
  const env = getEnv();
  const app = await createServer();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`Server listening on ${env.HOST}:${env.PORT}`);
  } catch (err) {
    logger.fatal('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }

  return app;
}
