import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import {
  inferBackendId,
  profileFromBackend,
  type ProviderBackendId,
} from './providerCatalog';
import {
  PREFS_STORAGE_KEY,
  PROFILES_STORAGE_KEY,
  type ProviderId,
  type ProviderPrefs,
} from './types';
import { loadJson, saveJson } from './storage';

export type HubProviderProfile = {
  id: string;
  name: string;
  backendId: ProviderBackendId;
  providerId: ProviderId;
  model: string;
  apiKey: string;
  baseUrl?: string;
};

export type ProfileStore = {
  activeId: string;
  profiles: HubProviderProfile[];
};

const PRESET_BACKENDS: ProviderBackendId[] = ['openai', 'anthropic', 'gemini', 'ollama'];

function newId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultStore(): ProfileStore {
  const profiles = PRESET_BACKENDS.map((backendId) => {
    const base = profileFromBackend(backendId, '', '');
    return { ...base, id: newId(), apiKey: '' };
  });
  return { activeId: profiles[0]!.id, profiles };
}

function sanitizeProfile(p: HubProviderProfile): HubProviderProfile {
  const backendId = inferBackendId(p);
  const base = profileFromBackend(backendId, p.model, p.apiKey, p.name, p.baseUrl);
  return { ...p, ...base, id: p.id, backendId };
}

function migrateLegacy(raw: string | null): ProfileStore | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as ProviderPrefs;
    if (!o?.providerId) return null;
    const id = newId();
    const stub: HubProviderProfile = {
      id,
      name: 'Migrated',
      backendId: 'openai',
      providerId: o.providerId,
      model: o.model || 'gpt-4o-mini',
      apiKey: o.apiKey || '',
      baseUrl: o.baseUrl,
    };
    return { activeId: id, profiles: [sanitizeProfile(stub)] };
  } catch {
    return null;
  }
}

export async function loadProfileStore(bridge: EvenAppBridge | null): Promise<ProfileStore> {
  const stored = await loadJson<ProfileStore>(bridge, PROFILES_STORAGE_KEY);
  if (stored?.profiles?.length && stored.activeId) {
    return {
      activeId: stored.activeId,
      profiles: stored.profiles.map(sanitizeProfile),
    };
  }
  const legacyObj = await loadJson<ProviderPrefs>(bridge, PREFS_STORAGE_KEY);
  if (legacyObj?.providerId) {
    const migrated = migrateLegacy(JSON.stringify(legacyObj));
    if (migrated) {
      await saveProfileStore(bridge, migrated);
      return migrated;
    }
  }
  const legacy = await loadJson<string>(bridge, PREFS_STORAGE_KEY);
  const migrated = migrateLegacy(typeof legacy === 'string' ? legacy : null);
  if (migrated) {
    await saveProfileStore(bridge, migrated);
    return migrated;
  }
  try {
    const localLegacy = localStorage.getItem(PREFS_STORAGE_KEY);
    const m2 = migrateLegacy(localLegacy);
    if (m2) return m2;
  } catch {
    /* ignore */
  }
  return defaultStore();
}

export async function saveProfileStore(
  bridge: EvenAppBridge | null,
  store: ProfileStore,
): Promise<void> {
  await saveJson(bridge, PROFILES_STORAGE_KEY, store);
}

export function getActiveProfile(store: ProfileStore): HubProviderProfile {
  return store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0]!;
}

export function profileToPrefs(p: HubProviderProfile): ProviderPrefs {
  return {
    providerId: p.providerId,
    model: p.model,
    apiKey: p.apiKey,
    baseUrl: p.baseUrl,
  };
}

export function prefsReadyFromProfile(p: HubProviderProfile): boolean {
  return Boolean(p.apiKey.trim() && p.model.trim());
}

export function addProfile(store: ProfileStore, partial?: Partial<HubProviderProfile>): ProfileStore {
  const id = newId();
  const backendId = partial?.backendId ?? 'openai';
  const base = profileFromBackend(
    backendId,
    partial?.model ?? '',
    partial?.apiKey ?? '',
    partial?.name ?? 'New profile',
    partial?.baseUrl,
  );
  const profile = sanitizeProfile({ ...base, id, apiKey: partial?.apiKey ?? '' });
  return { activeId: id, profiles: [...store.profiles, profile] };
}

export function updateProfile(
  store: ProfileStore,
  id: string,
  patch: Partial<HubProviderProfile>,
): ProfileStore {
  return {
    ...store,
    profiles: store.profiles.map((p) =>
      p.id === id ? sanitizeProfile({ ...p, ...patch, id: p.id }) : p,
    ),
  };
}

export function deleteProfile(store: ProfileStore, id: string): ProfileStore {
  const profiles = store.profiles.filter((p) => p.id !== id);
  if (profiles.length === 0) return defaultStore();
  const activeId = store.activeId === id ? profiles[0]!.id : store.activeId;
  return { activeId, profiles };
}
