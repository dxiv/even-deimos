import type { ProviderId } from './types';
import { isOpenRouterFreeModel, OPENROUTER_FREE_MODELS } from './freeModels';

/** User-facing provider entry (matches Deimos CLI presets). */
export type ProviderBackendId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter_free'
  | 'groq'
  | 'ollama'
  | 'openrouter'
  | 'deepseek'
  | 'mistral'
  | 'together'
  | 'lmstudio'
  | 'moonshot'
  | 'perplexity'
  | 'custom_compat';

export type ProviderBackendDef = {
  id: ProviderBackendId;
  /** Short label in dropdown */
  label: string;
  /** One-line help under provider field */
  hint: string;
  providerId: ProviderId;
  baseUrl?: string;
  models: readonly string[];
  defaultModel: string;
  requiresApiKey: boolean;
};

export const PROVIDER_BACKENDS: readonly ProviderBackendDef[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    hint: 'api.openai.com — GPT & Codex models',
    providerId: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-5.3-codex',
      'o1',
      'o1-mini',
      'o3-mini',
    ],
    defaultModel: 'gpt-4o-mini',
    requiresApiKey: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    hint: 'Claude models via Messages API',
    providerId: 'anthropic',
    models: [
      'claude-3-5-haiku-latest',
      'claude-sonnet-4-20250514',
      'claude-sonnet-4-6',
      'claude-opus-4-20250514',
      'claude-opus-4-6',
    ],
    defaultModel: 'claude-3-5-haiku-latest',
    requiresApiKey: true,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    hint: 'Gemini via Google AI API',
    providerId: 'gemini',
    models: [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-pro-preview-05-06',
      'gemini-2.5-flash-preview-05-20',
    ],
    defaultModel: 'gemini-2.0-flash',
    requiresApiKey: true,
  },
  {
    id: 'openrouter_free',
    label: 'OpenRouter (free)',
    hint: '$0 models — OpenRouter API key required (openrouter.ai/keys)',
    providerId: 'openai_compat',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: OPENROUTER_FREE_MODELS,
    defaultModel: 'openrouter/free',
    requiresApiKey: true,
  },
  {
    id: 'groq',
    label: 'Groq',
    hint: 'Fast inference — OpenAI-compatible API',
    providerId: 'openai_compat',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    requiresApiKey: true,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    hint: 'DeepSeek chat models',
    providerId: 'openai_compat',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    requiresApiKey: true,
  },
  {
    id: 'mistral',
    label: 'Mistral',
    hint: 'Mistral AI platform',
    providerId: 'openai_compat',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
    defaultModel: 'mistral-large-latest',
    requiresApiKey: true,
  },
  {
    id: 'together',
    label: 'Together AI',
    hint: 'Hosted open models',
    providerId: 'openai_compat',
    baseUrl: 'https://api.together.xyz/v1',
    models: [
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-R1',
    ],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    requiresApiKey: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    hint: 'Many models through one API key',
    providerId: 'openai_compat',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-haiku',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.3-70b-instruct',
      ...OPENROUTER_FREE_MODELS,
    ],
    defaultModel: 'openai/gpt-4o-mini',
    requiresApiKey: true,
  },
  {
    id: 'moonshot',
    label: 'Moonshot (Kimi)',
    hint: 'Kimi models',
    providerId: 'openai_compat',
    baseUrl: 'https://api.moonshot.ai/v1',
    models: ['kimi-k2.5', 'moonshot-v1-8k', 'moonshot-v1-32k'],
    defaultModel: 'kimi-k2.5',
    requiresApiKey: true,
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    hint: 'Sonar search-augmented models',
    providerId: 'openai_compat',
    baseUrl: 'https://api.perplexity.ai/v1',
    models: ['sonar', 'sonar-pro', 'sonar-reasoning-pro'],
    defaultModel: 'sonar',
    requiresApiKey: true,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    hint: 'Run on your PC — default localhost:11434',
    providerId: 'openai_compat',
    baseUrl: 'http://localhost:11434/v1',
    models: [
      'llama3.2',
      'llama3.2:3b',
      'llama3.1:8b',
      'qwen2.5-coder:7b',
      'mistral',
      'codellama',
    ],
    defaultModel: 'llama3.2',
    requiresApiKey: false,
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    hint: 'Local server — default localhost:1234',
    providerId: 'openai_compat',
    baseUrl: 'http://localhost:1234/v1',
    models: ['local-model', 'llama-3.2-3b-instruct', 'qwen2.5-coder-7b-instruct'],
    defaultModel: 'local-model',
    requiresApiKey: false,
  },
  {
    id: 'custom_compat',
    label: 'Custom (OpenAI-compatible)',
    hint: 'Set base URL; pick a common model id below',
    providerId: 'openai_compat',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      'gpt-4o-mini',
      'llama3.2',
      'local-model',
      'deepseek-chat',
    ],
    defaultModel: 'gpt-4o-mini',
    requiresApiKey: false,
  },
] as const;

export function getBackend(id: ProviderBackendId): ProviderBackendDef {
  return PROVIDER_BACKENDS.find((b) => b.id === id) ?? PROVIDER_BACKENDS[0]!;
}

export function inferBackendId(profile: {
  providerId: ProviderId;
  baseUrl?: string;
  model?: string;
  backendId?: ProviderBackendId;
}): ProviderBackendId {
  if (profile.backendId && getBackend(profile.backendId)) return profile.backendId;

  const url = (profile.baseUrl ?? '').toLowerCase();
  if (profile.providerId === 'anthropic') return 'anthropic';
  if (profile.providerId === 'gemini') return 'gemini';
  if (profile.providerId === 'openai' && (!url || url.includes('api.openai.com'))) return 'openai';

  if (url.includes('11434')) return 'ollama';
  if (url.includes('1234')) return 'lmstudio';
  if (url.includes('groq.com')) return 'groq';
  if (url.includes('deepseek')) return 'deepseek';
  if (url.includes('mistral')) return 'mistral';
  if (url.includes('together')) return 'together';
  if (url.includes('openrouter')) {
    if (profile.model && isOpenRouterFreeModel(profile.model)) return 'openrouter_free';
    return 'openrouter';
  }
  if (url.includes('moonshot')) return 'moonshot';
  if (url.includes('perplexity')) return 'perplexity';

  if (profile.providerId === 'openai_compat') return 'custom_compat';
  return 'openai';
}

export function profileFromBackend(
  backendId: ProviderBackendId,
  model: string,
  apiKey: string,
  name?: string,
  baseUrlOverride?: string,
): Pick<
  import('./providerProfiles').HubProviderProfile,
  'name' | 'providerId' | 'model' | 'apiKey' | 'baseUrl' | 'backendId'
> {
  const b = getBackend(backendId);
  const modelOk = b.models.includes(model) ? model : b.defaultModel;
  return {
    name: name ?? b.label,
    backendId,
    providerId: b.providerId,
    model: modelOk,
    apiKey,
    baseUrl:
      b.providerId === 'openai_compat'
        ? baseUrlOverride?.trim() || b.baseUrl
        : b.baseUrl,
  };
}

export function normalizeModel(backendId: ProviderBackendId, model: string): string {
  const b = getBackend(backendId);
  if (b.models.includes(model)) return model;
  return b.defaultModel;
}
