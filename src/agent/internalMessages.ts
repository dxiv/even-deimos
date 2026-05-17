import type { ChatMessage } from './types';

export type OaiToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type InternalMsg =
  | { role: 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls: OaiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export function toInternal(messages: ChatMessage[]): InternalMsg[] {
  return messages
    .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } =>
      m.role === 'user' || m.role === 'assistant',
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

export function internalToChat(messages: InternalMsg[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (m.role === 'tool') continue;
    if ('tool_calls' in m) {
      if (m.content) out.push({ role: 'assistant', content: m.content });
      continue;
    }
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

export function toRawOaiToolCalls(
  calls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
): OaiToolCall[] {
  return calls.map((c) => ({
    id: c.id,
    type: 'function',
    function: { name: c.name, arguments: JSON.stringify(c.arguments) },
  }));
}
