import { webFetch } from './webFetch';
import type { ToolCallRequest, ToolContext, ToolDefinition } from './types';

export type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;

type RegisteredTool = ToolDefinition & { handler: ToolHandler };

const tools = new Map<string, RegisteredTool>();

export function registerTool(def: ToolDefinition, handler: ToolHandler): void {
  tools.set(def.name, { ...def, handler });
}

export function unregisterTool(name: string): void {
  tools.delete(name);
}

export function clearDynamicTools(prefix = 'mcp__'): void {
  for (const name of [...tools.keys()]) {
    if (name.startsWith(prefix)) tools.delete(name);
  }
}

export function listToolDefinitions(): ToolDefinition[] {
  return [...tools.values()].map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}

export async function executeTool(
  call: ToolCallRequest,
  ctx: ToolContext,
): Promise<{ output: string; isError: boolean }> {
  const t = tools.get(call.name);
  if (!t) {
    return { output: `Unknown tool: ${call.name}`, isError: true };
  }
  try {
    const output = await t.handler(call.arguments, ctx);
    return { output: output.slice(0, 8000), isError: false };
  } catch (e) {
    return { output: e instanceof Error ? e.message : String(e), isError: true };
  }
}

function bootBuiltinTools(): void {
  registerTool(
    {
      name: 'web_fetch',
      description: 'Fetch a public URL and return plain text (HTML stripped).',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'HTTPS URL to fetch' } },
        required: ['url'],
      } as ToolDefinition['parameters'],
    },
    async (args) => {
      const url = String(args.url ?? '').trim();
      if (!/^https?:\/\//i.test(url)) throw new Error('url must be http(s)');
      return webFetch(url);
    },
  );

  registerTool(
    {
      name: 'ask_user',
      description: 'Ask the user a short clarifying question on the phone UI.',
      parameters: {
        type: 'object',
        properties: { question: { type: 'string', description: 'Question for the user' } },
        required: ['question'],
      },
    },
    async (args, ctx) => {
      const q = String(args.question ?? '').trim();
      if (!q) throw new Error('question required');
      if (!ctx.onAskUser) throw new Error('ask_user not available');
      return ctx.onAskUser(q);
    },
  );
}

bootBuiltinTools();
