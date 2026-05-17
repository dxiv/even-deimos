import type { ChatMessage, ProviderPrefs, StreamEvent } from './types';
import { streamChat } from './chatClient';
import { webFetch } from './tools/webFetch';

export type AgentLoopOpts = {
  prefs: ProviderPrefs;
  messages: ChatMessage[];
  signal: AbortSignal;
  systemPrompt?: string;
  toolsEnabled?: boolean;
  onAskUser?: (question: string) => Promise<string>;
};

const URL_RE = /https?:\/\/[^\s<>"']+/i;

export async function* runAgentLoop(opts: AgentLoopOpts): AsyncGenerator<StreamEvent> {
  const { prefs, messages, signal, systemPrompt, toolsEnabled, onAskUser } = opts;

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const text = lastUser?.content ?? '';

  if (toolsEnabled && URL_RE.test(text)) {
    const url = text.match(URL_RE)?.[0];
    if (url) {
      yield { type: 'tool_start', toolName: 'web_fetch', summary: url.slice(0, 60) };
      try {
        const out = await webFetch(url);
        yield { type: 'tool_result', toolName: 'web_fetch', output: out.slice(0, 2000) };
        const augmented: ChatMessage[] = [
          ...messages.slice(0, -1),
          {
            role: 'user',
            content: `${text}\n\n[Fetched ${url}]\n${out.slice(0, 4000)}`,
          },
        ];
        yield* streamChat({ prefs, messages: augmented, signal, systemPromptOverride: systemPrompt });
        return;
      } catch (e) {
        yield {
          type: 'tool_result',
          toolName: 'web_fetch',
          output: e instanceof Error ? e.message : String(e),
          isError: true,
        };
      }
    }
  }

  if (toolsEnabled && text.toLowerCase().includes('?') && onAskUser && text.length < 120) {
    const promptId = `ask_${Date.now()}`;
    yield { type: 'action_required', promptId, question: text };
    const reply = await onAskUser(text);
    if (signal.aborted) return;
    yield* streamChat({
      prefs,
      messages: [...messages, { role: 'user', content: reply }],
      signal,
      systemPromptOverride: systemPrompt,
    });
    return;
  }

  yield* streamChat({ prefs, messages, signal, systemPromptOverride: systemPrompt });
}
