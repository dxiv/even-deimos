import { describe, expect, it } from 'vitest';
import { executeSlashInput } from './execute';

describe('executeSlashInput', () => {
  it('handles /help', () => {
    const r = executeSlashInput('/help');
    expect(r.handled).toBe(true);
    if (r.handled) expect(r.action).toBe('help');
  });

  it('passes through normal text', () => {
    const r = executeSlashInput('hello');
    expect(r.handled).toBe(false);
    if (!r.handled) expect(r.userText).toBe('hello');
  });

  it('expands /review prompt', () => {
    const r = executeSlashInput('/review fix the bug');
    expect(r.handled).toBe(true);
    if (r.handled && r.action === 'prompt') expect(r.userText).toContain('Review');
  });
});
