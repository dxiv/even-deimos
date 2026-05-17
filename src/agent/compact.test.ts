import { describe, expect, it } from 'vitest';
import { needsCompact } from './compact';

describe('compact', () => {
  it('triggers when transcript exceeds threshold', () => {
    const short = [{ role: 'user' as const, content: 'hi' }];
    expect(needsCompact(short)).toBe(false);
    const long = [{ role: 'user' as const, content: 'x'.repeat(13_000) }];
    expect(needsCompact(long)).toBe(true);
  });
});
