/** Expand native <select> into a scrollable listbox when option count is high (Hub WebView). */

const MIN_OPTIONS = 6;
const MAX_VISIBLE_ROWS = 8;

function optionCount(select: HTMLSelectElement): number {
  return select.options.length;
}

function shouldExpand(select: HTMLSelectElement): boolean {
  return optionCount(select) > MIN_OPTIONS;
}

function closeSelect(select: HTMLSelectElement): void {
  select.size = 1;
  select.classList.remove('dm-select--expanded');
  select.closest('.dm-field')?.classList.remove('dm-field--select-open');
}

function openSelect(select: HTMLSelectElement): void {
  if (!shouldExpand(select)) {
    closeSelect(select);
    return;
  }
  const rows = Math.min(optionCount(select), MAX_VISIBLE_ROWS);
  select.size = rows;
  select.classList.add('dm-select--expanded');
  select.closest('.dm-field')?.classList.add('dm-field--select-open');
}

export function resetScrollableSelect(select: HTMLSelectElement | null): void {
  if (!select) return;
  closeSelect(select);
}

export function wireScrollableSelect(select: HTMLSelectElement): void {
  if (select.classList.contains('dm-nav-select')) return;
  if (select.dataset.dmScrollable === '1') return;
  select.dataset.dmScrollable = '1';
  select.classList.add('dm-select');

  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleClose = (): void => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => closeSelect(select), 180);
  };

  const cancelClose = (): void => {
    clearTimeout(closeTimer);
  };

  select.addEventListener('pointerdown', (e) => {
    if (!shouldExpand(select)) return;
    if (select.classList.contains('dm-select--expanded')) return;
    e.preventDefault();
    cancelClose();
    openSelect(select);
    select.focus();
  });

  select.addEventListener('focus', () => {
    cancelClose();
    if (shouldExpand(select)) openSelect(select);
  });

  select.addEventListener('blur', scheduleClose);
  select.addEventListener('change', () => closeSelect(select));

  select.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSelect(select);
      select.blur();
    }
  });
}

export function wireScrollableSelects(root: ParentNode = document): void {
  for (const el of root.querySelectorAll('select.dm-select')) {
    if (el instanceof HTMLSelectElement) wireScrollableSelect(el);
  }
}
