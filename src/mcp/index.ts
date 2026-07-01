import { getLogger } from '../utils/logger.js';

const logger = getLogger();

export interface MCPTool {
  name: string;
  description: string;
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export class MCPManager {
  private tools: Map<string, MCPTool> = new Map();

  register(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    logger.info(`MCP tool registered: ${tool.name}`);
  }

  get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getAll(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`MCP tool not found: ${name}`);
    }
    logger.debug(`Executing MCP tool: ${name}`, { args });
    return tool.execute(args);
  }
}

class BrowserTool implements MCPTool {
  name = 'browser';
  description = 'Browser automation tool for web interactions';

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const { action, url, ...rest } = args as { action: string; url?: string; [key: string]: unknown };
    logger.info(`Browser action: ${action}${url ? ` on ${url}` : ''}`, rest);
    return { status: 'acknowledged', action, url };
  }
}

class FilesystemTool implements MCPTool {
  name = 'filesystem';
  description = 'Filesystem operations tool';

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const { action, path, ...rest } = args as { action: string; path?: string; [key: string]: unknown };
    logger.info(`Filesystem action: ${action} on ${path}`, rest);
    return { status: 'acknowledged', action, path };
  }
}

class GitHubTool implements MCPTool {
  name = 'github';
  description = 'GitHub operations tool';

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const { action, ...rest } = args as { action: string; [key: string]: unknown };
    logger.info(`GitHub action: ${action}`, rest);
    return { status: 'acknowledged', action };
  }
}

let mcpManagerInstance: MCPManager | null = null;

export function getMCPManager(): MCPManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new MCPManager();
    mcpManagerInstance.register(new BrowserTool());
    mcpManagerInstance.register(new FilesystemTool());
    mcpManagerInstance.register(new GitHubTool());
  }
  return mcpManagerInstance;
}
