import type { ChatMessage, ProviderPrefs, StreamEvent } from '../types';
import { SYSTEM_PROMPT } from '../types';

export async function* streamAnthropicChat(
  prefs: ProviderPrefs,
  messages: ChatMessage[],
  signal: AbortSignal,
  systemPrompt: string = SYSTEM_PROMPT,
): AsyncGenerator<StreamEvent> {
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: prefs.model,
    max_tokens: 4096,
    stream: true,
    system: systemPrompt,
    messages: messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
  };

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': prefs.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
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
        if (!data || data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            full += parsed.delta.text;
            yield { type: 'text_chunk', text: parsed.delta.text };
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

function formatApiError(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    if (j.error?.message) return `${status}: ${j.error.message}`;
  } catch {
    /* ignore */
  }
  return body ? `${status}: ${body.slice(0, 200)}` : `HTTP ${status}`;
}
