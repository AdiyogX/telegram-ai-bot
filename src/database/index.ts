import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { getEnv } from '../config/env.js';
import { SCHEMA_SQL } from './schema.js';
import { type IDatabase } from '../interfaces/index.js';
import {
  type User,
  type Chat,
  type Message,
  type Session,
  type UserSettings,
  type ConversationRole,
} from '../types/index.js';

export class SQLiteDatabase implements IDatabase {
  private db!: SqlJsDatabase;
  private dbPath!: string;

  async initialize(): Promise<void> {
    const env = getEnv();
    this.dbPath = env.DATABASE_PATH;
    const dir = path.dirname(this.dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const SQL = await initSqlJs();

    let buffer: Buffer | null = null;
    if (fs.existsSync(this.dbPath)) {
      buffer = fs.readFileSync(this.dbPath);
    }

    this.db = new SQL.Database(buffer);
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA journal_mode = MEMORY');

    const statements = SCHEMA_SQL.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        this.db.run(stmt + ';');
      } catch (e) {
        // ignore if table already exists
      }
    }

    this.save();
  }

  private save(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  async close(): Promise<void> {
    this.save();
    this.db.close();
  }

  private queryAll(sql: string, params?: unknown[]): Record<string, unknown>[] {
    const stmt = this.db.prepare(sql);
    if (params) stmt.bind(params);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push(row);
    }
    stmt.free();
    return results;
  }

  private queryOne(sql: string, params?: unknown[]): Record<string, unknown> | undefined {
    const results = this.queryAll(sql, params);
    return results[0];
  }

  private execute(sql: string, params?: unknown[]): void {
    this.db.run(sql, params);
    this.save();
  }

  async getUser(telegramId: number): Promise<User | null> {
    const row = this.queryOne('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    return row ? this.mapUser(row) : null;
  }

  async createUser(
    telegramId: number,
    username: string | null,
    firstName: string,
    lastName: string | null,
    languageCode: string | null,
  ): Promise<User> {
    this.execute(
      `INSERT INTO users (telegram_id, username, first_name, last_name, language_code)
       VALUES (?, ?, ?, ?, ?)`,
      [telegramId, username, firstName, lastName, languageCode],
    );
    return (await this.getUser(telegramId))!;
  }

  async updateUserActivity(userId: number): Promise<void> {
    this.execute(
      "UPDATE users SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [userId],
    );
  }

  async getChat(telegramId: number): Promise<Chat | null> {
    const row = this.queryOne('SELECT * FROM chats WHERE telegram_id = ?', [telegramId]);
    return row ? this.mapChat(row) : null;
  }

  async createChat(
    telegramId: number,
    type: string,
    title: string | null,
    username: string | null,
    firstName: string | null,
    lastName: string | null,
  ): Promise<Chat> {
    this.execute(
      `INSERT INTO chats (telegram_id, type, title, username, first_name, last_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [telegramId, type, title, username, firstName, lastName],
    );
    return (await this.getChat(telegramId))!;
  }

  async updateChatActivity(chatId: number): Promise<void> {
    this.execute(
      "UPDATE chats SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [chatId],
    );
  }

  async saveMessage(
    userId: number,
    chatId: number,
    role: ConversationRole,
    content: string,
    tokens: number | null,
    telegramChatId: number,
    telegramUserId: number | null,
    telegramMessageId: number | null,
  ): Promise<Message> {
    this.execute(
      `INSERT INTO messages (user_id, chat_id, role, content, tokens, telegram_chat_id, telegram_user_id, telegram_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, chatId, role, content, tokens, telegramChatId, telegramUserId, telegramMessageId],
    );
    const rows = this.queryAll('SELECT * FROM messages ORDER BY id DESC LIMIT 1');
    return this.mapMessage(rows[0]);
  }

  async getChatHistory(chatId: number, limit = 50): Promise<Message[]> {
    const rows = this.queryAll(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?',
      [chatId, limit],
    );
    return rows.map(r => this.mapMessage(r)).reverse();
  }

  async getSession(userId: number, chatId: number): Promise<Session | null> {
    const row = this.queryOne(
      `SELECT * FROM sessions WHERE user_id = ? AND chat_id = ? AND is_active = 1 AND expires_at > datetime('now')`,
      [userId, chatId],
    );
    return row ? this.mapSession(row) : null;
  }

  async createSession(userId: number, chatId: number): Promise<Session> {
    this.execute(
      'INSERT INTO sessions (user_id, chat_id) VALUES (?, ?)',
      [userId, chatId],
    );
    const rows = this.queryAll('SELECT * FROM sessions ORDER BY id DESC LIMIT 1');
    return this.mapSession(rows[0]);
  }

  async updateSessionContext(sessionId: number, context: string, tokenCount: number): Promise<void> {
    this.execute(
      'UPDATE sessions SET context = ?, token_count = ?, updated_at = datetime("now") WHERE id = ?',
      [context, tokenCount, sessionId],
    );
  }

  async incrementSessionMessages(sessionId: number): Promise<void> {
    this.execute(
      'UPDATE sessions SET message_count = message_count + 1, updated_at = datetime("now") WHERE id = ?',
      [sessionId],
    );
  }

  async deactivateSession(sessionId: number): Promise<void> {
    this.execute(
      'UPDATE sessions SET is_active = 0, updated_at = datetime("now") WHERE id = ?',
      [sessionId],
    );
  }

  async getUserSettings(userId: number): Promise<UserSettings | null> {
    const row = this.queryOne('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
    return row ? this.mapUserSettings(row) : null;
  }

  async createUserSettings(userId: number): Promise<UserSettings> {
    this.execute('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)', [userId]);
    return (await this.getUserSettings(userId))!;
  }

  async updateUserSettings(userId: number, updates: Partial<UserSettings>): Promise<void> {
    const allowed = ['model', 'system_prompt', 'temperature', 'max_tokens', 'is_enabled'];
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowed.includes(dbKey)) {
        sets.push(`${dbKey} = ?`);
        values.push(value);
      }
    }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      values.push(userId);
      this.execute(`UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = ?`, values);
    }
  }

  async cleanupSessions(): Promise<void> {
    this.execute("UPDATE sessions SET is_active = 0 WHERE expires_at <= datetime('now')");
  }

  async getTotalUsers(): Promise<number> {
    const row = this.queryOne('SELECT COUNT(*) as count FROM users');
    return (row?.count as number) || 0;
  }

  async getTotalMessages(): Promise<number> {
    const row = this.queryOne('SELECT COUNT(*) as count FROM messages');
    return (row?.count as number) || 0;
  }

  async getActiveSessions(): Promise<number> {
    const row = this.queryOne(
      "SELECT COUNT(*) as count FROM sessions WHERE is_active = 1 AND expires_at > datetime('now')",
    );
    return (row?.count as number) || 0;
  }

  async incrementUserMessageCount(userId: number): Promise<void> {
    this.execute(
      'UPDATE users SET total_messages = total_messages + 1, last_activity_at = datetime("now") WHERE id = ?',
      [userId],
    );
  }

  async incrementChatMessageCount(chatId: number): Promise<void> {
    this.execute(
      'UPDATE chats SET total_messages = total_messages + 1, last_activity_at = datetime("now") WHERE id = ?',
      [chatId],
    );
  }

  async isAdmin(telegramId: number): Promise<boolean> {
    const row = this.queryOne('SELECT is_admin FROM users WHERE telegram_id = ?', [telegramId]);
    return row ? (row.is_admin as number) === 1 : false;
  }

  async getAdmins(): Promise<number[]> {
    const rows = this.queryAll('SELECT telegram_id FROM users WHERE is_admin = 1');
    return rows.map(r => r.telegram_id as number);
  }

  private mapUser(row: Record<string, unknown>): User {
    return {
      id: row.id as number,
      telegramId: row.telegram_id as bigint,
      username: row.username as string | null,
      firstName: row.first_name as string,
      lastName: row.last_name as string | null,
      languageCode: row.language_code as string | null,
      isBot: Boolean(row.is_bot),
      isAdmin: Boolean(row.is_admin),
      isBlocked: Boolean(row.is_blocked),
      totalMessages: row.total_messages as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      lastActivityAt: row.last_activity_at as string,
    };
  }

  private mapChat(row: Record<string, unknown>): Chat {
    return {
      id: row.id as number,
      telegramId: row.telegram_id as bigint,
      type: row.type as string,
      title: row.title as string | null,
      username: row.username as string | null,
      firstName: row.first_name as string | null,
      lastName: row.last_name as string | null,
      isActive: Boolean(row.is_active),
      totalMessages: row.total_messages as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      lastActivityAt: row.last_activity_at as string,
    };
  }

  private mapMessage(row: Record<string, unknown>): Message {
    return {
      id: row.id as number,
      telegramMessageId: row.telegram_message_id as number | null,
      userId: row.user_id as number,
      chatId: row.chat_id as number,
      role: row.role as ConversationRole,
      content: row.content as string,
      tokens: row.tokens as number | null,
      telegramChatId: row.telegram_chat_id as bigint,
      telegramUserId: row.telegram_user_id as bigint | null,
      createdAt: row.created_at as string,
    };
  }

  private mapSession(row: Record<string, unknown>): Session {
    return {
      id: row.id as number,
      userId: row.user_id as number,
      chatId: row.chat_id as number,
      context: row.context as string,
      summary: row.summary as string | null,
      messageCount: row.message_count as number,
      tokenCount: row.token_count as number,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      expiresAt: row.expires_at as string,
    };
  }

  private mapUserSettings(row: Record<string, unknown>): UserSettings {
    return {
      userId: row.user_id as number,
      model: row.model as string,
      systemPrompt: row.system_prompt as string | null,
      temperature: row.temperature as number,
      maxTokens: row.max_tokens as number,
      isEnabled: Boolean(row.is_enabled),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

let dbInstance: SQLiteDatabase | null = null;

export function getDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = new SQLiteDatabase();
  }
  return dbInstance;
}
