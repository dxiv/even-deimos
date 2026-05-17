/** Phone mirror of the G2 lens (nav + scrollable text). */

import { scrollGlassesLensText } from './deimosBridge';

export type LensNavItem = {  action: string;
  label: string;
};

export type LensDisplaySnapshot = {
  header: string;
  main: string;
  status: string;
  exitConfirm: boolean;
  nav: LensNavItem[];
  scrollHint: string;
};

export type LensPreviewHandlers = {
  onNavAction: (action: string) => void;
  onExitLens?: () => void;
};

let handlers: LensPreviewHandlers | null = null;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function setLensPreviewHandlers(h: LensPreviewHandlers | null): void {
  handlers = h;
}

export function renderLensPreview(snap: LensDisplaySnapshot): void {
  const wrap = $('dm-lens-wrap');
  if (!wrap) return;

  const header = $('dm-lens-header');
  const main = $('dm-lens-main');
  const status = $('dm-lens-status');
  const nav = $('dm-lens-nav');
  const hint = $('dm-lens-hint');

  if (header) header.textContent = snap.header;
  if (main) main.textContent = snap.main || ' ';
  if (status) {
    status.textContent = snap.status;
    status.hidden = !snap.status;
  }
  if (hint) hint.textContent = snap.scrollHint;

  if (nav) {
    nav.replaceChildren();
    for (const item of snap.nav) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dm-lens-nav__btn mono';
      btn.textContent = item.label;
      btn.dataset.action = item.action;
      if (item.action === '__header__') {
        btn.classList.add('dm-lens-nav__btn--header');
        btn.disabled = true;
      }
      nav.appendChild(btn);
    }
  }

  wrap.classList.toggle('dm-lens--exit', snap.exitConfirm);
}

export function wireLensPreview(): void {
  const nav = $('dm-lens-nav');
  nav?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!btn?.dataset.action || btn.disabled) return;
    const action = btn.dataset.action;
    if (action === '__header__') return;
    handlers?.onNavAction(action);
  });

  $('dm-lens-exit')?.addEventListener('click', () => handlers?.onExitLens?.());

  const content = $('dm-lens-main')?.parentElement;
  content?.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      scrollGlassesLensText(e.deltaY > 0 ? 'down' : 'up');
    },
    { passive: false },
  );
}
