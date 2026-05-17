import { describe, expect, it } from 'vitest';
import {
  addProfile,
  defaultStore,
  getActiveProfile,
  prefsReadyFromProfile,
} from './providerProfiles';

describe('prefsReadyFromProfile', () => {
  it('requires api key and model', () => {
    const store = defaultStore();
    expect(prefsReadyFromProfile(getActiveProfile(store))).toBe(false);
    const withKey = addProfile(store, { apiKey: 'sk-x', model: 'gpt-4o-mini' });
    expect(prefsReadyFromProfile(getActiveProfile(withKey))).toBe(true);
  });
});

describe('defaultStore', () => {
  it('creates presets', () => {
    expect(defaultStore().profiles.length).toBeGreaterThan(2);
  });
});
