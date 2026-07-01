import { getLogger } from '../utils/logger.js';
import { getMCPManager } from '../mcp/index.js';

const logger = getLogger();

export interface BrowserAction {
  type: 'navigate' | 'click' | 'fill' | 'screenshot' | 'extract' | 'search';
  target?: string;
  value?: string;
  url?: string;
}

export class BrowserAutomation {
  async execute(actions: BrowserAction | BrowserAction[]): Promise<unknown[]> {
    const actionsArray = Array.isArray(actions) ? actions : [actions];
    const results: unknown[] = [];

    for (const action of actionsArray) {
      try {
        const result = await this.performAction(action);
        results.push(result);
        logger.info('Browser action completed', { type: action.type, url: action.url, target: action.target });
      } catch (error) {
        logger.error('Browser action failed', { type: action.type, error: (error as Error).message });
        results.push({ error: (error as Error).message, action });
      }
    }

    return results;
  }

  private async performAction(action: BrowserAction): Promise<unknown> {
    const mcp = getMCPManager();
    return mcp.execute('browser', action as unknown as Record<string, unknown>);
  }

  async searchDocumentation(query: string): Promise<void> {
    logger.info(`Searching documentation for: ${query}`);
    await this.execute({
      type: 'search',
      value: query,
    });
  }

  async openUrl(url: string): Promise<void> {
    logger.info(`Opening URL: ${url}`);
    await this.execute({
      type: 'navigate',
      url,
    });
  }
}

let browserInstance: BrowserAutomation | null = null;

export function getBrowserAutomation(): BrowserAutomation {
  if (!browserInstance) {
    browserInstance = new BrowserAutomation();
  }
  return browserInstance;
}
