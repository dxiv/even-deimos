import { clearDynamicTools, listToolDefinitions, registerTool } from '../agent/tools/registry';
import type { ToolDefinition } from '../agent/tools/types';
import { callMcpTool, listMcpTools } from './hubClient';
import type { McpStore } from './config';

function mcpToolName(serverId: string, toolName: string): string {
  const safe = `${serverId}_${toolName}`.replace(/[^a-zA-Z0-9_]/g, '_');
  return `mcp__${safe}`.slice(0, 64);
}

export async function syncMcpToolsToRegistry(store: McpStore): Promise<string[]> {
  clearDynamicTools('mcp__');
  const errors: string[] = [];
  for (const server of store.servers) {
    if (!server.enabled) continue;
    try {
      const names = await listMcpTools(server);
      for (const toolName of names) {
        const regName = mcpToolName(server.id, toolName);
        const def: ToolDefinition = {
          name: regName,
          description: `MCP "${toolName}" (${server.name})`,
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'JSON arguments object as string' },
            },
          },
        };
        registerTool(def, async (args) => {
          let parsed: Record<string, unknown> = {};
          const raw = String(args.input ?? '{}');
          try {
            parsed = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            parsed = { query: raw };
          }
          return callMcpTool(server, toolName, parsed);
        });
      }
    } catch (e) {
      errors.push(`${server.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return errors;
}

export function newMcpServerId(): string {
  return `mcp_${Date.now().toString(36)}`;
}

export function parseMcpHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function countMcpTools(): number {
  return listToolDefinitions().filter((t) => t.name.startsWith('mcp__')).length;
}
