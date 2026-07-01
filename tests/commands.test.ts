import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('Commands', () => {
  beforeAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test:token';
    process.env.NVIDIA_API_KEY = 'test-key';
  });

  it('should export command handlers', async () => {
    const commands = await import('../src/handlers/commands.js');
    expect(commands.startCommand).toBeDefined();
    expect(commands.helpCommand).toBeDefined();
    expect(commands.resetCommand).toBeDefined();
    expect(commands.pingCommand).toBeDefined();
    expect(commands.statsCommand).toBeDefined();
    expect(commands.aboutCommand).toBeDefined();
    expect(commands.settingsCommand).toBeDefined();
    expect(commands.adminCommand).toBeDefined();
  });

  it('should have valid constants', async () => {
    const { COMMANDS, COMMAND_DESCRIPTIONS, BOT_VERSION, BOT_NAME } = await import('../src/constants/index.js');
    expect(COMMANDS.START).toBe('start');
    expect(COMMANDS.HELP).toBe('help');
    expect(BOT_VERSION).toBeDefined();
    expect(BOT_NAME).toBeDefined();
    expect(COMMAND_DESCRIPTIONS[COMMANDS.START]).toBeDefined();
  });
});
