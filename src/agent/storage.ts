import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';

export async function loadJson<T>(
  bridge: EvenAppBridge | null,
  key: string,
): Promise<T | null> {
  const parse = (raw: string | null): T | null => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  if (bridge) {
    try {
      const raw = await bridge.getLocalStorage(key);
      const v = parse(raw);
      if (v) return v;
    } catch {
      /* fallback */
    }
  }
  try {
    return parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

export async function saveJson<T>(
  bridge: EvenAppBridge | null,
  key: string,
  value: T,
): Promise<void> {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
  } catch {
    /* ignore */
  }
  if (!bridge) return;
  try {
    await bridge.setLocalStorage(key, json);
  } catch {
    /* ignore */
  }
}
