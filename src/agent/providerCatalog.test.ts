import { describe, expect, it } from 'vitest';
import { isOpenRouterFreeModel, OPENROUTER_FREE_MODELS } from './freeModels';
import { getBackend, inferBackendId, normalizeModel } from './providerCatalog';

describe('providerCatalog', () => {
  it('lists models for openai', () => {
    const b = getBackend('openai');
    expect(b.models).toContain('gpt-4o-mini');
    expect(normalizeModel('openai', 'not-a-model')).toBe(b.defaultModel);
  });

  it('infers ollama from base url', () => {
    expect(
      inferBackendId({
        providerId: 'openai_compat',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.2',
      }),
    ).toBe('ollama');
  });

  it('exposes openrouter free models', () => {
    const b = getBackend('openrouter_free');
    expect(b.models.length).toBe(OPENROUTER_FREE_MODELS.length);
    expect(b.models).toContain('qwen/qwen3-coder:free');
    expect(isOpenRouterFreeModel('meta-llama/llama-3.3-70b-instruct:free')).toBe(true);
    expect(isOpenRouterFreeModel('gpt-4o-mini')).toBe(false);
  });

  it('infers openrouter_free from free model id', () => {
    expect(
      inferBackendId({
        providerId: 'openai_compat',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'qwen/qwen3-coder:free',
      }),
    ).toBe('openrouter_free');
  });
});
