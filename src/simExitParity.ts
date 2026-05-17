import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';

const SESSION_KEY = 'deimos_sim_exit_parity';
const QUERY_ON = 'simExitParity';
const OVERLAY_CLASS = 'dm-sim-exit-parity';

export function initSimExitParityFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get(QUERY_ON) === '1') sessionStorage.setItem(SESSION_KEY, '1');
    if (q.get(QUERY_ON) === '0') sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* no storage */
  }
}

export function isSimExitParitySession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function removeExistingOverlay(): void {
  document.querySelectorAll(`.${OVERLAY_CLASS}`).forEach((n) => n.remove());
}

export function offerHubExitSimulatorParityUi(bridge: EvenAppBridge): void {
  if (typeof document === 'undefined') return;
  removeExistingOverlay();

  const root = document.createElement('div');
  root.className = OVERLAY_CLASS;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'dm-sim-exit-parity-title');

  root.innerHTML = `
    <div class="${OVERLAY_CLASS}__panel mono">
      <p id="dm-sim-exit-parity-title" class="${OVERLAY_CLASS}__title">Simulator · Deimos exit</p>
      <p class="${OVERLAY_CLASS}__body">
        The real app shows a system sheet here. Use Stay or force leave for QA.
      </p>
      <div class="${OVERLAY_CLASS}__actions">
        <button type="button" class="${OVERLAY_CLASS}__btn ${OVERLAY_CLASS}__btn--ghost" data-dm-sim-act="stay">Stay</button>
        <button type="button" class="${OVERLAY_CLASS}__btn" data-dm-sim-act="force">Leave app</button>
      </div>
    </div>
  `;

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-dm-sim-act]');
    if (btn?.dataset.dmSimAct === 'force') {
      root.remove();
      void bridge.shutDownPageContainer(0);
      return;
    }
    if (btn?.dataset.dmSimAct === 'stay') {
      root.remove();
      return;
    }
    root.remove();
  });
  document.body.appendChild(root);
}
