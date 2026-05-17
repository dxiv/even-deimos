export type ProviderId = 'openai' | 'anthropic' | 'openai_compat' | 'gemini';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/** Legacy single-profile shape; migrated to providerProfiles store. */
export type ProviderPrefs = {
  providerId: ProviderId;
  model: string;
  apiKey: string;
  baseUrl?: string;
};

export type StreamEvent =
  | { type: 'text_chunk'; text: string }
  | { type: 'tool_start'; toolName: string; summary?: string }
  | { type: 'tool_result'; toolName: string; output: string; isError?: boolean }
  | { type: 'action_required'; promptId: string; question: string }
  | { type: 'done'; fullText: string }
  | { type: 'error'; message: string; code?: string };

export type AgentMode = 'standalone' | 'tether';

export const SYSTEM_PROMPT =
  'You are Deimos, a concise coding assistant. Answer clearly in plain text. Keep replies focused for reading on AR glasses.';

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  openai_compat: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
};

export const PREFS_STORAGE_KEY = 'deimos:v1:provider';
export const PROFILES_STORAGE_KEY = 'deimos:v2:profiles';
export const MESSAGES_STORAGE_KEY = 'deimos:v1:messages';
export const SESSIONS_STORAGE_KEY = 'deimos:v1:sessions';
export const THEME_STORAGE_KEY = 'deimos:v1:theme';
export const TETHER_STORAGE_KEY = 'deimos:v1:tether';
export const MCP_STORAGE_KEY = 'deimos:v1:mcp';
export const MAX_STORED_MESSAGES = 40;

export type ThemeId = 'terminal-black' | 'high-contrast' | 'dim';

export type TetherSettings = {
  mode: AgentMode;
  hostUrl: string;
  token?: string;
};
