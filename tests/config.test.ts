import { describe, it, expect, afterAll, beforeAll } from 'vitest';

describe('Config', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test:token';
    process.env.NVIDIA_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should validate environment', async () => {
    const { loadEnv } = await import('../src/config/env.js');
    const env = loadEnv();
    expect(env.TELEGRAM_BOT_TOKEN).toBe('test:token');
    expect(env.NVIDIA_API_KEY).toBe('test-key');
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3000);
  });

  it('should detect development mode', async () => {
    const { isDev, isProd } = await import('../src/config/env.js');
    expect(isDev()).toBe(false);
    expect(isProd()).toBe(false);
  });
});
