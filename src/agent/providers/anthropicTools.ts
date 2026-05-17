import type { ChatMessage, ProviderPrefs } from '../types';
import type { ToolCallRequest, ToolDefinition } from '../tools/types';
import { streamAnthropicChat } from './anthropic';
import type { StreamEvent } from '../types';

export async function completeAnthropicWithTools(
  prefs: ProviderPrefs,
  messages: ChatMessage[],
  systemPrompt: string,
  tools: ToolDefinition[],
  signal: AbortSignal,
): Promise<{ content: string; toolCalls: ToolCallRequest[] }> {
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: prefs.model,
    max_tokens: 4096,
    system: systemPrompt,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    })),
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
    throw new Error(errText.slice(0, 200) || `HTTP ${res.status}`);
  }

  const j = (await res.json()) as {
    content?: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };

  let content = '';
  const toolCalls: ToolCallRequest[] = [];
  for (const block of j.content ?? []) {
    if (block.type === 'text' && block.text) content += block.text;
    if (block.type === 'tool_use' && block.id && block.name) {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input ?? {},
      });
    }
  }
  return { content, toolCalls };
}

export async function* streamAnthropicFinal(
  prefs: ProviderPrefs,
  messages: ChatMessage[],
  systemPrompt: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  yield* streamAnthropicChat(prefs, messages, signal, systemPrompt);
}

