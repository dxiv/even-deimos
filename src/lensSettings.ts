import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { loadJson, saveJson } from './agent/storage';

export type LensSettings = {
  /** Ms between textContainerUpgrade calls when streaming (0 = fast). */
  paceMs: number;
};

const LENS_STORAGE_KEY = 'deimos:v1:lens';

const DEFAULT: LensSettings = { paceMs: 0 };

export async function loadLensSettings(bridge: EvenAppBridge | null): Promise<LensSettings> {
  return (await loadJson<LensSettings>(bridge, LENS_STORAGE_KEY)) ?? { ...DEFAULT };
}

export async function saveLensSettings(bridge: EvenAppBridge | null, s: LensSettings): Promise<void> {
  await saveJson(bridge, LENS_STORAGE_KEY, s);
}

export function getLensUpgradeThrottleMs(settings: LensSettings): number {
  return Math.max(0, Math.min(800, settings.paceMs));
}
