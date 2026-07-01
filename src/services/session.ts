import { getDatabase } from '../database/index.js';
import { getAIService } from '../ai/nvidia.js';
import { MAX_HISTORY_LENGTH, MAX_CONTEXT_TOKENS } from '../constants/index.js';
import { type ISessionManager } from '../interfaces/index.js';
import { type ConversationRole } from '../types/index.js';

export class SessionManager implements ISessionManager {

  async getContext(userId: number, chatId: number): Promise<{ role: ConversationRole; content: string }[]> {
    const db = getDatabase();
    let session = await db.getSession(userId, chatId);

    if (!session) {
      session = await db.createSession(userId, chatId);
    }

    const context = JSON.parse(session.context) as { role: ConversationRole; content: string }[];
    return context;
  }

  async addMessage(userId: number, chatId: number, role: ConversationRole, content: string, tokens?: number): Promise<void> {
    const db = getDatabase();
    let session = await db.getSession(userId, chatId);

    if (!session) {
      session = await db.createSession(userId, chatId);
    }

    const context = JSON.parse(session.context) as { role: ConversationRole; content: string }[];
    const tokenCount = tokens || Math.ceil(content.length / 4);

    context.push({ role, content });

    while (context.length > MAX_HISTORY_LENGTH) {
      context.splice(1, 1);
    }

    let totalTokens = 0;
    for (const msg of context) {
      totalTokens += this.countTokens(msg.content);
      if (totalTokens > MAX_CONTEXT_TOKENS) {
        const excess = context.indexOf(msg);
        context.splice(1, excess);
        break;
      }
    }

    await db.updateSessionContext(session.id, JSON.stringify(context), session.tokenCount + tokenCount);
    await db.incrementSessionMessages(session.id);
  }

  async resetSession(userId: number, chatId: number): Promise<void> {
    const db = getDatabase();
    const session = await db.getSession(userId, chatId);
    if (session) {
      await db.deactivateSession(session.id);
    }
  }

  async summarizeSession(userId: number, chatId: number): Promise<string> {
    const context = await this.getContext(userId, chatId);
    if (context.length === 0) return 'No conversation to summarize.';

    const conversationText = context.map(m => `${m.role}: ${m.content}`).join('\n');
    const ai = getAIService();

    try {
      const response = await ai.chat({
        messages: [
          {
            role: 'user',
            content: `Summarize this conversation in 2-3 sentences:\n\n${conversationText}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 256,
      });
      return response.content;
    } catch {
      return 'Summary unavailable.';
    }
  }

  private countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}
