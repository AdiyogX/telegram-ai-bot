export type ConversationRole = 'system' | 'user' | 'assistant';

export interface IDatabase {
  initialize(): Promise<void>;
  close(): Promise<void>;
  getUser(telegramId: number): Promise<import('../types/index.js').User | null>;
  createUser(telegramId: number, username: string | null, firstName: string, lastName: string | null, languageCode: string | null): Promise<import('../types/index.js').User>;
  updateUserActivity(userId: number): Promise<void>;
  getChat(telegramId: number): Promise<import('../types/index.js').Chat | null>;
  createChat(telegramId: number, type: string, title: string | null, username: string | null, firstName: string | null, lastName: string | null): Promise<import('../types/index.js').Chat>;
  updateChatActivity(chatId: number): Promise<void>;
  saveMessage(userId: number, chatId: number, role: ConversationRole, content: string, tokens: number | null, telegramChatId: number, telegramUserId: number | null, telegramMessageId: number | null): Promise<import('../types/index.js').Message>;
  getChatHistory(chatId: number, limit?: number): Promise<import('../types/index.js').Message[]>;
  getSession(userId: number, chatId: number): Promise<import('../types/index.js').Session | null>;
  createSession(userId: number, chatId: number): Promise<import('../types/index.js').Session>;
  updateSessionContext(sessionId: number, context: string, tokenCount: number): Promise<void>;
  incrementSessionMessages(sessionId: number): Promise<void>;
  deactivateSession(sessionId: number): Promise<void>;
  getUserSettings(userId: number): Promise<import('../types/index.js').UserSettings | null>;
  createUserSettings(userId: number): Promise<import('../types/index.js').UserSettings>;
  updateUserSettings(userId: number, updates: Partial<import('../types/index.js').UserSettings>): Promise<void>;
  cleanupSessions(): Promise<void>;
  getTotalUsers(): Promise<number>;
  getTotalMessages(): Promise<number>;
  getActiveSessions(): Promise<number>;
  incrementUserMessageCount(userId: number): Promise<void>;
  incrementChatMessageCount(chatId: number): Promise<void>;
  isAdmin(telegramId: number): Promise<boolean>;
  getAdmins(): Promise<number[]>;
}

export interface ILogger {
  trace(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  fatal(message: string, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): ILogger;
}

export interface IAIService {
  chat(request: AIRequest): Promise<import('../types/index.js').AIResponse>;
  chatStream(request: AIRequest): AsyncGenerator<import('../types/index.js').AIChatStreamChunk>;
  countTokens(text: string): number;
  isAvailable(): Promise<boolean>;
}

export interface AIRequest {
  messages: { role: ConversationRole; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ICommandHandler {
  name: string;
  description: string;
  handle(ctx: import('grammy').Context): Promise<void>;
}

export interface IMiddleware {
  name: string;
  handler(ctx: import('grammy').Context, next: () => Promise<void>): Promise<void>;
}

export interface ISessionManager {
  getContext(userId: number, chatId: number): Promise<{ role: ConversationRole; content: string }[]>;
  addMessage(userId: number, chatId: number, role: ConversationRole, content: string, tokens?: number): Promise<void>;
  resetSession(userId: number, chatId: number): Promise<void>;
  summarizeSession(userId: number, chatId: number): Promise<string>;
}
