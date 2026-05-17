import { describe, expect, it } from 'vitest';
import { getLensUpgradeThrottleMs } from './lensSettings';

describe('lensSettings', () => {
  it('clamps pace to 0–800ms', () => {
    expect(getLensUpgradeThrottleMs({ paceMs: -10 })).toBe(0);
    expect(getLensUpgradeThrottleMs({ paceMs: 120 })).toBe(120);
    expect(getLensUpgradeThrottleMs({ paceMs: 9999 })).toBe(800);
  });
});
