import axios, { type AxiosInstance } from 'axios';
import { getEnv } from '../config/env.js';
import { getLogger } from '../utils/logger.js';
import { AI_TIMEOUT_MS, AI_RETRY_ATTEMPTS, AI_RETRY_DELAY_MS, DEFAULT_SYSTEM_PROMPT } from '../constants/index.js';
import { type IAIService, type AIRequest } from '../interfaces/index.js';
import { type AIResponse, type AIChatStreamChunk } from '../types/index.js';

export class NVIDIAService implements IAIService {
  private client: AxiosInstance;
  private logger = getLogger();

  constructor() {
    const env = getEnv();
    this.client = axios.create({
      baseURL: env.NVIDIA_API_BASE_URL,
      timeout: AI_TIMEOUT_MS,
      headers: {
        'Authorization': `Bearer ${env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const env = getEnv();
    const model = request.model || env.NVIDIA_MODEL;

    const messages = [
      { role: 'system' as const, content: DEFAULT_SYSTEM_PROMPT },
      ...request.messages,
    ];

    for (let attempt = 1; attempt <= AI_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await this.client.post('/chat/completions', {
          model,
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          stream: false,
        });

        const data = response.data;
        const choice = data.choices?.[0];
        const content = choice?.message?.content || '';
        const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        this.logger.debug('AI response received', {
          model,
          attempt,
          latency: Date.now() - startTime,
          tokens: usage.total_tokens,
        });

        return {
          content,
          model,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
          },
          latency: Date.now() - startTime,
        };
      } catch (error) {
        const isLast = attempt === AI_RETRY_ATTEMPTS;
        this.logger.warn(`AI request attempt ${attempt} failed`, {
          error: (error as Error).message,
          model,
          isLast,
        });

        if (isLast) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, AI_RETRY_DELAY_MS * attempt));
      }
    }

    throw new Error('AI request failed after all retries');
  }

  async *chatStream(request: AIRequest): AsyncGenerator<AIChatStreamChunk> {
    const env = getEnv();
    const model = request.model || env.NVIDIA_MODEL;

    const messages = [
      { role: 'system' as const, content: DEFAULT_SYSTEM_PROMPT },
      ...request.messages,
    ];

    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model,
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          stream: true,
        },
        { responseType: 'stream', timeout: AI_TIMEOUT_MS },
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false };
            }
          } catch {
            // skip parse errors
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      this.logger.error('AI stream error', { error: (error as Error).message });
      throw error;
    }
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

let aiServiceInstance: NVIDIAService | null = null;

export function getAIService(): NVIDIAService {
  if (!aiServiceInstance) {
    aiServiceInstance = new NVIDIAService();
  }
  return aiServiceInstance;
}
