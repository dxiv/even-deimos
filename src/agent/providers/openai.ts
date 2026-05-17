import type { ChatMessage, ProviderPrefs, StreamEvent } from '../types';
import { SYSTEM_PROMPT } from '../types';

function openAiBaseUrl(prefs: ProviderPrefs): string {
  const raw = prefs.baseUrl?.trim() || 'https://api.openai.com/v1';
  return raw.replace(/\/$/, '');
}

export async function* streamOpenAiChat(
  prefs: ProviderPrefs,
  messages: ChatMessage[],
  signal: AbortSignal,
  systemPrompt: string = SYSTEM_PROMPT,
): AsyncGenerator<StreamEvent> {
  const url = `${openAiBaseUrl(prefs)}/chat/completions`;
  const body = {
    model: prefs.model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
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
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) {
            full += chunk;
            yield { type: 'text_chunk', text: chunk };
          }
        } catch {
          /* skip malformed SSE line */
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
