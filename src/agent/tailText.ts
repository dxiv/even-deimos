/** Keep the last `max` characters of text for G2 display limits. */
export function tailText(text: string, max: number): string {
  if (text.length <= max) return text;
  return '…' + text.slice(text.length - max + 1);
}

export const GLASSES_TEXT_MAX_STARTUP = 1000;
export const GLASSES_TEXT_MAX_UPGRADE = 2000;
export const GLASSES_TAIL_MAX = 1800;

export function glassesDisplayText(full: string, useUpgradeLimit: boolean): string {
  const cap = useUpgradeLimit ? GLASSES_TEXT_MAX_UPGRADE : GLASSES_TEXT_MAX_STARTUP;
  return tailText(full, Math.min(cap, GLASSES_TAIL_MAX));
}

/** Slice display upward so lens scroll shows earlier lines. */
export function glassesDisplayTextAtOffset(
  full: string,
  useUpgradeLimit: boolean,
  lineOffset: number,
): string {
  const lines = full.split('\n');
  const off = Math.max(0, Math.min(lineOffset, Math.max(0, lines.length - 1)));
  return glassesDisplayText(lines.slice(off).join('\n'), useUpgradeLimit);
}
