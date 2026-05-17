import type { ChatMessage, ProviderPrefs, StreamEvent } from './types';
import { streamAnthropicChat } from './providers/anthropic';
import { streamGeminiChat } from './providers/gemini';
import { streamOpenAiChat } from './providers/openai';

export type ChatStreamOptions = {
  prefs: ProviderPrefs;
  messages: ChatMessage[];
  signal: AbortSignal;
  systemPromptOverride?: string;
};

export async function* streamChat(opts: ChatStreamOptions): AsyncGenerator<StreamEvent> {
  const { prefs, messages, signal, systemPromptOverride } = opts;

  if (!prefs.apiKey.trim()) {
    yield { type: 'error', message: 'API key not set — open Provider settings' };
    return;
  }
  if (!prefs.model.trim()) {
    yield { type: 'error', message: 'Model name is required' };
    return;
  }

  const wrapped = systemPromptOverride
    ? async function* () {
        const orig = messages;
        void orig;
        if (prefs.providerId === 'anthropic') {
          yield* streamAnthropicChat(prefs, messages, signal, systemPromptOverride);
        } else if (prefs.providerId === 'gemini') {
          yield* streamGeminiChat(prefs, messages, signal);
        } else {
          yield* streamOpenAiChat(prefs, messages, signal, systemPromptOverride);
        }
      }
    : null;

  if (wrapped) {
    yield* wrapped();
    return;
  }

  if (prefs.providerId === 'anthropic') {
    yield* streamAnthropicChat(prefs, messages, signal);
    return;
  }
  if (prefs.providerId === 'gemini') {
    yield* streamGeminiChat(prefs, messages, signal);
    return;
  }

  yield* streamOpenAiChat(prefs, messages, signal);
}

export async function testProviderConnection(prefs: ProviderPrefs): Promise<string> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 25_000);
  let last = '';
  try {
    for await (const ev of streamChat({
      prefs,
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      signal: ctrl.signal,
    })) {
      if (ev.type === 'text_chunk') last += ev.text;
      if (ev.type === 'error') throw new Error(ev.message);
      if (ev.type === 'done') return ev.fullText.trim() || last.trim() || 'ok';
    }
    return last.trim() || 'Connected';
  } finally {
    clearTimeout(timeout);
  }
}
