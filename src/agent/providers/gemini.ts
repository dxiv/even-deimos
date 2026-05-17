import type { ChatMessage, ProviderPrefs, StreamEvent } from '../types';
import { SYSTEM_PROMPT } from '../types';

export async function* streamGeminiChat(
  prefs: ProviderPrefs,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const model = prefs.model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(prefs.apiKey)}`;

  const contents = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
  };

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    yield { type: 'error', message: `${res.status}: ${errText.slice(0, 200)}`, code: String(res.status) };
    return;
  }

  if (!res.body) {
    yield { type: 'error', message: 'No response body from Gemini' };
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
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const parts = parsed.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.text) {
              full += part.text;
              yield { type: 'text_chunk', text: part.text };
            }
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
