import { describe, expect, it } from 'vitest';
import { glassesDisplayText, tailText } from './tailText';

describe('tailText', () => {
  it('returns short text unchanged', () => {
    expect(tailText('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis prefix', () => {
    const long = 'a'.repeat(100);
    const out = tailText(long, 20);
    expect(out.length).toBe(20);
    expect(out.startsWith('…')).toBe(true);
    expect(out.endsWith('a')).toBe(true);
  });
});

describe('glassesDisplayText', () => {
  it('caps at startup limit', () => {
    const long = 'x'.repeat(2000);
    expect(glassesDisplayText(long, false).length).toBeLessThanOrEqual(1000);
  });

  it('allows larger tail when upgraded', () => {
    const long = 'y'.repeat(2500);
    const out = glassesDisplayText(long, true);
    expect(out.length).toBeLessThanOrEqual(1800);
  });
});
