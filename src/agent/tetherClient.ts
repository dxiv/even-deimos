import type { ChatMessage, StreamEvent, TetherSettings } from './types';
import { TETHER_STORAGE_KEY } from './types';
import { loadJson, saveJson } from './storage';

export async function loadTetherSettings(
  bridge: import('@evenrealities/even_hub_sdk').EvenAppBridge | null,
): Promise<TetherSettings> {
  const s = await loadJson<TetherSettings>(bridge, TETHER_STORAGE_KEY);
  return (
    s ?? {
      mode: 'standalone',
      hostUrl: 'http://127.0.0.1:8765',
    }
  );
}

export async function saveTetherSettings(
  bridge: import('@evenrealities/even_hub_sdk').EvenAppBridge | null,
  settings: TetherSettings,
): Promise<void> {
  await saveJson(bridge, TETHER_STORAGE_KEY, settings);
}

/** JSON-lines SSE from desktop Deimos HTTP bridge (Phase 5). */
export async function* streamTetherChat(
  settings: TetherSettings,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const url = settings.hostUrl.replace(/\/$/, '') + '/v1/chat';
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(settings.token ? { Authorization: `Bearer ${settings.token}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    yield {
      type: 'error',
      message: `Tether ${res.status} — is the desktop bridge running?`,
      code: String(res.status),
    };
    return;
  }

  if (!res.body) {
    yield { type: 'error', message: 'No tether response body' };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const ev = JSON.parse(t) as StreamEvent;
        yield ev;
      } catch {
        /* skip */
      }
    }
  }
}
