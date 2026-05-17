import type { McpServerConfig } from './config';

/** Minimal HTTP MCP tool list (JSON-RPC style); best-effort for Hub. */
export async function listMcpTools(server: McpServerConfig): Promise<string[]> {
  const res = await fetch(server.url.replace(/\/$/, '') + '/tools/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  if (!res.ok) throw new Error(`MCP list ${res.status}`);
  const j = (await res.json()) as { result?: { tools?: Array<{ name?: string }> } };
  return (j.result?.tools ?? []).map((t) => t.name ?? 'tool').filter(Boolean);
}

export async function callMcpTool(
  server: McpServerConfig,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(server.url.replace(/\/$/, '') + '/tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  if (!res.ok) throw new Error(`MCP call ${res.status}`);
  const j = (await res.json()) as { result?: { content?: Array<{ text?: string }> } };
  const parts = j.result?.content ?? [];
  return parts.map((p) => p.text ?? '').join('\n').slice(0, 4000) || JSON.stringify(j.result);
}
