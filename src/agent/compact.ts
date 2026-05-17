import type { ChatMessage, ProviderPrefs } from './types';
import { streamChat } from './chatClient';

const COMPACT_THRESHOLD_CHARS = 12_000;

export function needsCompact(messages: ChatMessage[]): boolean {
  const total = messages.reduce((n, m) => n + m.content.length, 0);
  return total > COMPACT_THRESHOLD_CHARS;
}

export async function compactMessages(
  prefs: ProviderPrefs,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<ChatMessage[]> {
  const transcript = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n\n');

  let summary = '';
  for await (const ev of streamChat({
    prefs,
    messages: [
      {
        role: 'user',
        content: `Summarize this conversation for continuation. Keep key facts, decisions, and open tasks under 800 words:\n\n${transcript.slice(0, 24_000)}`,
      },
    ],
    signal,
    systemPromptOverride:
      'You compress chat history. Output only the summary, no preamble.',
  })) {
    if (ev.type === 'text_chunk') summary += ev.text;
    if (ev.type === 'error') throw new Error(ev.message);
    if (ev.type === 'done') summary = ev.fullText || summary;
  }

  const recent = messages.filter((m) => m.role !== 'system').slice(-8);
  return [
    {
      role: 'system',
      content: `Prior context (compacted at ${new Date().toISOString()}):\n${summary.trim()}`,
    },
    ...recent,
  ];
}
