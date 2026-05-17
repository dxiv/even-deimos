import { describe, expect, it } from 'vitest';

/** Parse OpenAI SSE lines like the client does. */
function parseSseLines(buffer: string): string[] {
  const chunks: string[] = [];
  for (const line of buffer.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') continue;
    const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
    const c = parsed.choices?.[0]?.delta?.content;
    if (c) chunks.push(c);
  }
  return chunks;
}

describe('openai SSE parser', () => {
  it('extracts delta content', () => {
    const raw = `data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n`;
    expect(parseSseLines(raw).join('')).toBe('Hi');
  });
});
