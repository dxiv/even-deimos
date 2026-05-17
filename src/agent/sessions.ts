import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import type { ChatMessage } from './types';
import { SESSIONS_STORAGE_KEY, MAX_STORED_MESSAGES } from './types';
import { loadJson, saveJson } from './storage';

export type ChatSession = {
  id: string;
  title: string;
  /** When true, title is not overwritten by new messages. */
  titleManual?: boolean;
  updatedAt: number;
  messages: ChatMessage[];
};

export type SessionStore = {
  activeId: string;
  sessions: ChatSession[];
};

function newSessionId(): string {
  return `s_${Date.now().toString(36)}`;
}

function titleFromMessages(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return '';
  return first.content.trim().slice(0, 40);
}

/** Human-readable label for session picker (never duplicates a generic "New chat"). */
export function sessionDisplayTitle(s: ChatSession, all: ChatSession[]): string {
  if (s.titleManual && s.title.trim()) return s.title.trim();
  const fromUser = titleFromMessages(s.messages);
  if (fromUser) return fromUser;
  const sorted = [...all].sort((a, b) => b.updatedAt - a.updatedAt);
  const idx = sorted.findIndex((x) => x.id === s.id);
  return `Chat ${Math.max(1, idx + 1)}`;
}

export function createSession(messages: ChatMessage[] = []): ChatSession {
  const now = Date.now();
  const trimmed = messages.slice(-MAX_STORED_MESSAGES);
  return {
    id: newSessionId(),
    title: titleFromMessages(trimmed),
    updatedAt: now,
    messages: trimmed,
  };
}

export async function loadSessionStore(bridge: EvenAppBridge | null): Promise<SessionStore> {
  const stored = await loadJson<SessionStore>(bridge, SESSIONS_STORAGE_KEY);
  if (stored?.sessions?.length && stored.activeId) return stored;
  const s = createSession();
  return { activeId: s.id, sessions: [s] };
}

export async function saveSessionStore(
  bridge: EvenAppBridge | null,
  store: SessionStore,
): Promise<void> {
  await saveJson(bridge, SESSIONS_STORAGE_KEY, store);
}

export function getActiveSession(store: SessionStore): ChatSession {
  return store.sessions.find((s) => s.id === store.activeId) ?? store.sessions[0]!;
}

export function updateActiveMessages(
  store: SessionStore,
  messages: ChatMessage[],
): SessionStore {
  const active = getActiveSession(store);
  const trimmed = messages.slice(-MAX_STORED_MESSAGES);
  const autoTitle = titleFromMessages(trimmed);
  const title = active.titleManual
    ? active.title
    : autoTitle || sessionDisplayTitle({ ...active, messages: trimmed }, store.sessions);
  const updated: ChatSession = {
    ...active,
    messages: trimmed,
    title,
    updatedAt: Date.now(),
  };
  return {
    activeId: store.activeId,
    sessions: store.sessions.map((s) => (s.id === active.id ? updated : s)),
  };
}

export function newSessionInStore(store: SessionStore): SessionStore {
  const s = createSession();
  const sessions = [s, ...store.sessions].slice(0, 24);
  const titled = { ...s, title: sessionDisplayTitle(s, sessions) };
  return {
    activeId: titled.id,
    sessions: sessions.map((x) => (x.id === s.id ? titled : x)),
  };
}

export function switchSession(store: SessionStore, id: string): SessionStore {
  if (!store.sessions.some((s) => s.id === id)) return store;
  return { ...store, activeId: id };
}

export function renameSession(store: SessionStore, id: string, name: string): SessionStore {
  const trimmed = name.trim().slice(0, 60);
  return {
    ...store,
    sessions: store.sessions.map((s) => {
      if (s.id !== id) return s;
      if (!trimmed) {
        const restored = { ...s, titleManual: false as const };
        return {
          ...restored,
          title: sessionDisplayTitle(restored, store.sessions),
          updatedAt: Date.now(),
        };
      }
      return { ...s, title: trimmed, titleManual: true, updatedAt: Date.now() };
    }),
  };
}

export function deleteSession(store: SessionStore, id: string): SessionStore {
  const sessions = store.sessions.filter((s) => s.id !== id);
  if (sessions.length === 0) {
    const s = createSession();
    return { activeId: s.id, sessions: [s] };
  }
  const activeId = store.activeId === id ? sessions[0]!.id : store.activeId;
  return { activeId, sessions };
}
