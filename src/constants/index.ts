export const BOT_VERSION = '1.0.0';
export const BOT_NAME = 'NVIDIA AI Telegram Bot';

export const DEFAULT_SYSTEM_PROMPT = `You are a professional, helpful AI assistant integrated into a Telegram bot. You are powered by NVIDIA AI.

Guidelines:
- Be helpful, accurate, and concise
- Use markdown formatting when appropriate
- Maintain conversation context
- Be safe and avoid harmful content
- Admit when you don't know something
- Keep responses reasonably sized for Telegram
- Use bullet points and structured formatting for clarity
- Be friendly and professional`;

export const MAX_HISTORY_LENGTH = 50;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_CONTEXT_TOKENS = 4096;
export const AI_TIMEOUT_MS = 30000;
export const AI_RETRY_ATTEMPTS = 3;
export const AI_RETRY_DELAY_MS = 1000;

export const SESSION_TTL_SECONDS = 86400 * 7;
export const CLEANUP_INTERVAL_MS = 3600000;

export const TELEGRAM_MESSAGE_LIMIT = 4096;
export const TYPING_INTERVAL_MS = 4000;

export const COMMANDS = {
  START: 'start',
  HELP: 'help',
  RESET: 'reset',
  PING: 'ping',
  STATS: 'stats',
  ABOUT: 'about',
  SETTINGS: 'settings',
  ADMIN: 'admin',
} as const;

export const COMMAND_DESCRIPTIONS: Record<string, string> = {
  [COMMANDS.START]: 'Start the bot',
  [COMMANDS.HELP]: 'Show help information',
  [COMMANDS.RESET]: 'Reset conversation history',
  [COMMANDS.PING]: 'Check bot latency',
  [COMMANDS.STATS]: 'Show your usage statistics',
  [COMMANDS.ABOUT]: 'About this bot',
  [COMMANDS.SETTINGS]: 'Configure your settings',
  [COMMANDS.ADMIN]: 'Admin panel (admins only)',
};

export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again later.',
  RATE_LIMITED: 'You are sending messages too fast. Please slow down.',
  AUTH_FAILED: 'Authentication failed. Please restart the bot.',
  TIMEOUT: 'The AI took too long to respond. Please try again.',
  INVALID_INPUT: 'Invalid input provided.',
  NOT_ADMIN: 'You do not have permission to use this command.',
  MAINTENANCE: 'Bot is under maintenance. Please try again later.',
};

export const MODELS = {
  LLAMA_8B: 'meta/llama-3.1-8b-instruct',
  LLAMA_70B: 'meta/llama-3.1-70b-instruct',
  LLAMA_405B: 'meta/llama-3.1-405b-instruct',
  MISTRAL_7B: 'mistralai/mistral-7b-instruct-v0.3',
  MIXTRAL_8X7B: 'mistralai/mixtral-8x7b-instruct-v0.1',
  NEMOTRON_4: 'nvidia/nemotron-4-340b-instruct',
} as const;

export const EVENTS = {
  BOT_STARTED: 'bot:started',
  BOT_STOPPED: 'bot:stopped',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  AI_REQUEST: 'ai:request',
  AI_RESPONSE: 'ai:response',
  AI_ERROR: 'ai:error',
  ERROR: 'error',
  WARNING: 'warning',
} as const;

export const METRICS_PREFIX = 'telegram_ai_bot_';
