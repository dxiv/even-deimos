import type { ChatMessage, ProviderPrefs, StreamEvent } from './types';
import { streamChatWithTools, type ChatWithToolsOpts } from './chatWithTools';
import type { ToolContext } from './tools/types';

export type AgentLoopOpts = {
  prefs: ProviderPrefs;
  messages: ChatMessage[];
  signal: AbortSignal;
  systemPrompt?: string;
  toolsEnabled?: boolean;
  onAskUser?: (question: string) => Promise<string>;
};

export async function* runAgentLoop(opts: AgentLoopOpts): AsyncGenerator<StreamEvent> {
  const { prefs, messages, signal, systemPrompt, toolsEnabled, onAskUser } = opts;

  const toolCtx: ToolContext = { signal, onAskUser };

  const chatOpts: ChatWithToolsOpts = {
    prefs,
    messages,
    signal,
    systemPrompt,
    toolsEnabled,
    toolCtx,
  };

  yield* streamChatWithTools(chatOpts);
}
