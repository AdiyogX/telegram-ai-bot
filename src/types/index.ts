import { type ConversationRole } from '../interfaces/index.js';

export type { ConversationRole };

export interface User {
  id: number;
  telegramId: bigint;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
  isBot: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  totalMessages: number;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface Chat {
  id: number;
  telegramId: bigint;
  type: string;
  title: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  totalMessages: number;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface Message {
  id: number;
  telegramMessageId: number | null;
  userId: number;
  chatId: number;
  role: ConversationRole;
  content: string;
  tokens: number | null;
  telegramChatId: bigint;
  telegramUserId: bigint | null;
  createdAt: string;
}

export interface Session {
  id: number;
  userId: number;
  chatId: number;
  context: string;
  summary: string | null;
  messageCount: number;
  tokenCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface UserSettings {
  userId: number;
  model: string;
  systemPrompt: string | null;
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  role: ConversationRole;
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
}

export interface AIChatStreamChunk {
  content: string;
  done: boolean;
}

export interface BotMetrics {
  uptime: number;
  totalUsers: number;
  totalMessages: number;
  totalAiRequests: number;
  totalAiErrors: number;
  activeSessions: number;
  avgResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: boolean;
    ai: boolean;
    telegram: boolean;
    memory: boolean;
  };
  metrics: {
    totalUsers: number;
    totalMessages: number;
    activeSessions: number;
    memoryUsage: number;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
  requestId?: string;
  userId?: number;
  chatId?: number;
  latency?: number;
}
