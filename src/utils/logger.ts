import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';
import { getEnv, isDev } from '../config/env.js';
import { type ILogger } from '../interfaces/index.js';

class Logger implements ILogger {
  private logger: pino.Logger;

  constructor() {
    const env = getEnv();
    const logDir = env.LOG_FILE_PATH;

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const fileTransport = pino.transport({
      targets: [
        {
          target: 'pino/file',
          options: {
            destination: path.join(logDir, 'bot.log'),
            mkdir: true,
          },
        },
        {
          target: 'pino/file',
          options: {
            destination: path.join(logDir, 'error.log'),
            mkdir: true,
            level: 'error',
          },
        },
        ...(isDev()
          ? [
              {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              },
            ]
          : []),
      ],
    });

    this.logger = pino(
      {
        level: env.LOG_LEVEL,
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level(label) {
            return { level: label };
          },
          bindings() {
            return {};
          },
        },
      },
      fileTransport,
    );
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.logger.trace(context || {}, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context || {}, message);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context || {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context || {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(context || {}, message);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.logger.fatal(context || {}, message);
  }

  child(context: Record<string, unknown>): ILogger {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }
}

let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

export { Logger };
