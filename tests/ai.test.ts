import { describe, it, expect, beforeAll } from 'vitest';

describe('AI Service', () => {
  beforeAll(async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test:token';
    process.env.NVIDIA_API_KEY = 'test-key';
  });

  it('should have valid NVIDIAService export', async () => {
    const mod = await import('../src/ai/nvidia.js');
    expect(mod.NVIDIAService).toBeDefined();
  });

  it('should count tokens', async () => {
    const { NVIDIAService } = await import('../src/ai/nvidia.js');
    const service = new NVIDIAService();
    const tokens = service.countTokens('Hello, how are you today?');
    expect(tokens).toBeGreaterThan(0);
  });
});
