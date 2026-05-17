import type { ChatMessage, ProviderPrefs, StreamEvent } from './types';
import { SYSTEM_PROMPT } from './types';
import { internalToChat, toInternal, toRawOaiToolCalls, type InternalMsg } from './internalMessages';
import { completeOpenAiWithTools, streamOpenAiFinal } from './providers/openaiTools';
import { completeAnthropicWithTools, streamAnthropicFinal } from './providers/anthropicTools';
import { executeTool, listToolDefinitions } from './tools/registry';
import type { ToolCallRequest, ToolContext } from './tools/types';

export const MAX_AGENT_TURNS = 8;

export type ChatWithToolsOpts = {
  prefs: ProviderPrefs;
  messages: ChatMessage[];
  signal: AbortSignal;
  systemPrompt?: string;
  toolsEnabled?: boolean;
  toolCtx: ToolContext;
};

async function* executeToolCalls(
  calls: ToolCallRequest[],
  toolCtx: ToolContext,
): AsyncGenerator<StreamEvent, string[]> {
  const outputs: string[] = [];
  for (const call of calls) {
    if (call.name === 'ask_user') {
      const q = String(call.arguments.question ?? 'Need your input');
      yield { type: 'action_required', promptId: call.id, question: q };
    }
    const summary =
      call.name === 'web_fetch'
        ? String(call.arguments.url ?? '').slice(0, 60)
        : call.name.slice(0, 40);
    yield { type: 'tool_start', toolName: call.name, summary };
    const { output, isError } = await executeTool(call, toolCtx);
    outputs.push(output);
    yield { type: 'tool_result', toolName: call.name, output: output.slice(0, 2000), isError };
  }
  return outputs;
}

async function* runOpenAiToolLoop(
  prefs: ProviderPrefs,
  internal: InternalMsg[],
  systemPrompt: string,
  signal: AbortSignal,
  toolCtx: ToolContext,
): AsyncGenerator<StreamEvent, InternalMsg[]> {
  const defs = listToolDefinitions();
  let turns = 0;
  while (turns < MAX_AGENT_TURNS) {
    turns++;
    const { content, toolCalls } = await completeOpenAiWithTools(
      prefs,
      internal,
      systemPrompt,
      defs,
      signal,
    );
    if (!toolCalls.length) {
      if (content) internal.push({ role: 'assistant', content });
      return internal;
    }
    internal.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toRawOaiToolCalls(toolCalls),
    });
    const gen = executeToolCalls(toolCalls, toolCtx);
    let tr = await gen.next();
    const outputs: string[] = [];
    while (!tr.done) {
      yield tr.value;
      tr = await gen.next();
    }
    outputs.push(...(tr.value ?? []));
    for (let i = 0; i < toolCalls.length; i++) {
      internal.push({
        role: 'tool',
        tool_call_id: toolCalls[i].id,
        content: outputs[i] ?? '',
      });
    }
  }
  return internal;
}

async function* runAnthropicToolLoop(
  prefs: ProviderPrefs,
  internal: InternalMsg[],
  systemPrompt: string,
  signal: AbortSignal,
  toolCtx: ToolContext,
): AsyncGenerator<StreamEvent, InternalMsg[]> {
  const defs = listToolDefinitions();
  let turns = 0;
  while (turns < MAX_AGENT_TURNS) {
    turns++;
    const chatMsgs = internalToChat(internal);
    const { content, toolCalls } = await completeAnthropicWithTools(
      prefs,
      chatMsgs,
      systemPrompt,
      defs,
      signal,
    );
    if (!toolCalls.length) {
      if (content) internal.push({ role: 'assistant', content });
      return internal;
    }
    if (content) internal.push({ role: 'assistant', content });
    const gen = executeToolCalls(toolCalls, toolCtx);
    let tr = await gen.next();
    const outputs: string[] = [];
    while (!tr.done) {
      yield tr.value;
      tr = await gen.next();
    }
    outputs.push(...(tr.value ?? []));
    for (let i = 0; i < toolCalls.length; i++) {
      internal.push({
        role: 'user',
        content: `[Tool ${toolCalls[i].name} result]\n${outputs[i] ?? ''}`,
      });
    }
  }
  return internal;
}

export async function* streamChatWithTools(opts: ChatWithToolsOpts): AsyncGenerator<StreamEvent> {
  const { prefs, messages, signal, systemPrompt = SYSTEM_PROMPT, toolsEnabled, toolCtx } = opts;

  try {
    const { refreshMcpTools } = await import('../mcp/mcpUi');
    await refreshMcpTools();
  } catch {
    /* MCP optional */
  }

  if (!toolsEnabled || !listToolDefinitions().length) {
    const { streamChat } = await import('./chatClient');
    yield* streamChat({ prefs, messages, signal, systemPromptOverride: systemPrompt });
    return;
  }

  let internal = toInternal(messages);

  try {
    if (prefs.providerId === 'anthropic') {
      const gen = runAnthropicToolLoop(prefs, internal, systemPrompt, signal, toolCtx);
      let result = await gen.next();
      while (!result.done) {
        yield result.value;
        result = await gen.next();
      }
      internal = result.value;
    } else if (prefs.providerId === 'gemini') {
      const { streamChat } = await import('./chatClient');
      yield* streamChat({ prefs, messages, signal, systemPromptOverride: systemPrompt });
      return;
    } else {
      const gen = runOpenAiToolLoop(prefs, internal, systemPrompt, signal, toolCtx);
      let result = await gen.next();
      while (!result.done) {
        yield result.value;
        result = await gen.next();
      }
      internal = result.value;
    }
  } catch (e) {
    if (signal.aborted) return;
    yield { type: 'error', message: e instanceof Error ? e.message : String(e) };
    return;
  }

  const finalMessages = internalToChat(internal);
  if (prefs.providerId === 'anthropic') {
    yield* streamAnthropicFinal(prefs, finalMessages, systemPrompt, signal);
  } else {
    yield* streamOpenAiFinal(prefs, internal, systemPrompt, signal);
  }
}
