import {
  getBackend,
  inferBackendId,
  normalizeModel,
  PROVIDER_BACKENDS,
  type ProviderBackendId,
} from './agent/providerCatalog';
import type { HubProviderProfile } from './agent/providerProfiles';

export function fillProviderBackendSelect(select: HTMLSelectElement): void {
  select.replaceChildren();
  for (const b of PROVIDER_BACKENDS) {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.label;
    select.appendChild(opt);
  }
}

export function fillModelSelect(select: HTMLSelectElement, backendId: ProviderBackendId): void {
  const b = getBackend(backendId);
  select.replaceChildren();
  for (const m of b.models) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  }
}

export function setProviderHint(el: HTMLElement | null, backendId: ProviderBackendId): void {
  if (!el) return;
  el.textContent = getBackend(backendId).hint;
}

export function applyBackendToForm(
  backendId: ProviderBackendId,
  profile?: Partial<HubProviderProfile>,
): {
  backendId: ProviderBackendId;
  model: string;
  baseUrl: string;
  showBaseUrl: boolean;
} {
  const b = getBackend(backendId);
  const model = normalizeModel(
    backendId,
    profile?.model && b.models.includes(profile.model) ? profile.model : b.defaultModel,
  );
  const baseUrl =
    profile?.baseUrl?.trim() ||
    b.baseUrl ||
    (b.providerId === 'openai_compat' ? 'https://api.openai.com/v1' : '');
  return {
    backendId,
    model,
    baseUrl,
    showBaseUrl:
      backendId === 'custom_compat' || backendId === 'ollama' || backendId === 'lmstudio',
  };
}

export function baseUrlIsEditable(backendId: ProviderBackendId): boolean {
  return backendId === 'custom_compat' || backendId === 'ollama' || backendId === 'lmstudio';
}

export function readBackendFromProfile(p: HubProviderProfile): ProviderBackendId {
  return inferBackendId(p);
}
