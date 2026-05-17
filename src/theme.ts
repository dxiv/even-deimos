import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { THEME_STORAGE_KEY, type ThemeId } from './agent/types';
import { loadJson, saveJson } from './agent/storage';

export async function loadTheme(bridge: EvenAppBridge | null): Promise<ThemeId> {
  const t = await loadJson<ThemeId>(bridge, THEME_STORAGE_KEY);
  if (t === 'high-contrast' || t === 'dim' || t === 'terminal-black') return t;
  return 'terminal-black';
}

export async function saveTheme(bridge: EvenAppBridge | null, theme: ThemeId): Promise<void> {
  await saveJson(bridge, THEME_STORAGE_KEY, theme);
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
}
