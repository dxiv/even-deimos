import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import {
  getActiveProfile,
  loadProfileStore,
  profileToPrefs,
  prefsReadyFromProfile,
  saveProfileStore,
  type HubProviderProfile,
  type ProfileStore,
} from './providerProfiles';
import { getActiveSession, loadSessionStore, saveSessionStore, type SessionStore } from './sessions';
import type { ChatMessage, ProviderPrefs } from './types';

export function prefsReady(prefs: ProviderPrefs): boolean {
  return Boolean(prefs.apiKey.trim() && prefs.model.trim());
}

export { prefsReadyFromProfile };

export async function loadProviderPrefs(bridge: EvenAppBridge | null): Promise<ProviderPrefs> {
  const store = await loadProfileStore(bridge);
  return profileToPrefs(getActiveProfile(store));
}

export async function saveProviderPrefs(
  bridge: EvenAppBridge | null,
  prefs: ProviderPrefs,
): Promise<void> {
  const store = await loadProfileStore(bridge);
  const active = getActiveProfile(store);
  const next = {
    ...store,
    profiles: store.profiles.map((p) =>
      p.id === active.id
        ? {
            ...p,
            providerId: prefs.providerId,
            model: prefs.model,
            apiKey: prefs.apiKey,
            baseUrl: prefs.baseUrl,
          }
        : p,
    ),
  };
  await saveProfileStore(bridge, next);
}

export async function loadMessages(bridge: EvenAppBridge | null): Promise<ChatMessage[]> {
  const store = await loadSessionStore(bridge);
  return getActiveSession(store).messages;
}

export async function saveMessages(
  bridge: EvenAppBridge | null,
  messages: ChatMessage[],
): Promise<void> {
  const store = await loadSessionStore(bridge);
  const active = getActiveSession(store);
  const next = {
    ...store,
    sessions: store.sessions.map((s) =>
      s.id === active.id
        ? { ...s, messages, updatedAt: Date.now(), title: s.title }
        : s,
    ),
  };
  await saveSessionStore(bridge, next);
}

export async function loadProfiles(bridge: EvenAppBridge | null): Promise<ProfileStore> {
  return loadProfileStore(bridge);
}

export async function saveProfiles(
  bridge: EvenAppBridge | null,
  store: ProfileStore,
): Promise<void> {
  await saveProfileStore(bridge, store);
}

export async function loadSessions(bridge: EvenAppBridge | null): Promise<SessionStore> {
  return loadSessionStore(bridge);
}

export async function saveSessions(
  bridge: EvenAppBridge | null,
  store: SessionStore,
): Promise<void> {
  await saveSessionStore(bridge, store);
}

export type { HubProviderProfile, ProfileStore, SessionStore };
