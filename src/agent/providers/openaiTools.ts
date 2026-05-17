import type { ProviderPrefs, StreamEvent } from '../types';
import type { InternalMsg, OaiToolCall } from '../internalMessages';
import { internalToChat, toInternal } from '../internalMessages';
import type { ToolCallRequest, ToolDefinition } from '../tools/types';

export type { OaiToolCall };

type OaiApiMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OaiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

function openAiBaseUrl(prefs: ProviderPrefs): string {
  const raw = prefs.baseUrl?.trim() || 'https://api.openai.com/v1';
  return raw.replace(/\/$/, '');
}

function toOaiApiMessages(systemPrompt: string, internal: InternalMsg[]): OaiApiMessage[] {
  const out: OaiApiMessage[] = [{ role: 'system', content: systemPrompt }];
  for (const m of internal) {
    if (m.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: m.tool_call_id, content: m.content });
    } else if ('tool_calls' in m) {
      out.push({ role: 'assistant', content: m.content, tool_calls: m.tool_calls });
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

function parseToolCalls(raw: OaiToolCall[] | undefined): ToolCallRequest[] {
  if (!raw?.length) return [];
  return raw.map((tc) => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
    } catch {
      args = {};
    }
    return { id: tc.id, name: tc.function.name, arguments: args };
  });
}

export async function completeOpenAiWithTools(
  prefs: ProviderPrefs,
  internal: InternalMsg[],
  systemPrompt: string,
  tools: ToolDefinition[],
  signal: AbortSignal,
): Promise<{ content: string; toolCalls: ToolCallRequest[] }> {
  const url = `${openAiBaseUrl(prefs)}/chat/completions`;
  const body = {
    model: prefs.model,
    stream: false,
    messages: toOaiApiMessages(systemPrompt, internal),
    tools: tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    })),
  };

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${prefs.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(formatApiError(res.status, errText));
  }

  const j = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: OaiToolCall[] } }>;
  };
  const msg = j.choices?.[0]?.message;
  return {
    content: msg?.content ?? '',
    toolCalls: parseToolCalls(msg?.tool_calls),
  };
}

export async function* streamOpenAiFinal(
  prefs: ProviderPrefs,
  internal: InternalMsg[],
  systemPrompt: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const url = `${openAiBaseUrl(prefs)}/chat/completions`;
  const body = {
    model: prefs.model,
    stream: true,
    messages: toOaiApiMessages(systemPrompt, internal),
  };

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${prefs.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    yield { type: 'error', message: formatApiError(res.status, errText), code: String(res.status) };
    return;
  }
  if (!res.body) {
    yield { type: 'error', message: 'No response body from provider' };
    return;
  }

  let full = '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) {
            full += chunk;
            yield { type: 'text_chunk', text: chunk };
          }
        } catch {
          /* skip */
        }
      }
    }
  } catch (e) {
    if (signal.aborted) return;
    yield { type: 'error', message: e instanceof Error ? e.message : String(e) };
    return;
  }

  yield { type: 'done', fullText: full };
}

/** Legacy: stream from plain chat messages without tool history. */
export async function* streamOpenAiFromChat(
  prefs: ProviderPrefs,
  messages: ReturnType<typeof internalToChat>,
  systemPrompt: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  yield* streamOpenAiFinal(prefs, toInternalFromChat(messages), systemPrompt, signal);
}

function toInternalFromChat(messages: ReturnType<typeof internalToChat>): InternalMsg[] {
  return toInternal(messages);
}

function formatApiError(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    if (j.error?.message) return `${status}: ${j.error.message}`;
  } catch {
    /* ignore */
  }
  return body ? `${status}: ${body.slice(0, 200)}` : `HTTP ${status}`;
}
