/**
 * OpenRouter zero-cost models (`:free` suffix or `openrouter/free` router).
 * Curated from dxa-deimos ANDROID_INSTALL.md + common OpenRouter free tier IDs.
 * Availability can change — pick another model if one returns 404.
 */
export const OPENROUTER_FREE_MODELS = [
  'openrouter/free',
  'qwen/qwen3.6-plus-preview:free',
  'qwen/qwen3-coder:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-r1-0528:free',
  'mistralai/mistral-7b-instruct:free',
] as const;

export type OpenRouterFreeModelId = (typeof OPENROUTER_FREE_MODELS)[number];

export function isOpenRouterFreeModel(model: string): boolean {
  return model === 'openrouter/free' || model.endsWith(':free');
}
