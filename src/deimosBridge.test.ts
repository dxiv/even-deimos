import { describe, expect, it } from 'vitest';
import { deimosGlassesLayout } from './glassesLayout';

describe('deimosGlassesLayout', () => {
  it('places text to the right of list without overlap', () => {
    const { list, text } = deimosGlassesLayout();
    expect(list.x + list.w).toBeLessThanOrEqual(text.x);
    expect(text.x + text.w).toBeLessThanOrEqual(576);
    expect(text.y + text.h).toBeLessThanOrEqual(288);
  });
});
