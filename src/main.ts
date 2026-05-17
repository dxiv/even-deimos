import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import { initDeimosPage } from './deimosPage';
import { initSimExitParityFromUrl } from './simExitParity';
import './style.css';

const BRIDGE_WAIT_MS = 4000;

function forceBrowserOnly(): boolean {
  return new URLSearchParams(window.location.search).has('pc');
}

async function main() {
  initSimExitParityFromUrl();
  const loading = document.getElementById('dm-boot-screen');
  if (forceBrowserOnly()) {
    document.documentElement.classList.add('dm-browser-mode');
  }

  let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
  let bridgeAbsentReason: 'browser' | 'timeout' | undefined;

  if (forceBrowserOnly()) {
    bridgeAbsentReason = 'browser';
  } else {
    const raced = await Promise.race([
      waitForEvenAppBridge().then((b) => ({ kind: 'bridge' as const, b })),
      new Promise<{ kind: 'timeout' }>((resolve) =>
        setTimeout(() => resolve({ kind: 'timeout' }), BRIDGE_WAIT_MS),
      ),
    ]);
    if (raced.kind === 'timeout') bridgeAbsentReason = 'timeout';
    else bridge = raced.b;
  }

  loading?.remove();
  await initDeimosPage({ bridge, bridgeAbsentReason });
}

void main().catch((e) => {
  document.getElementById('dm-boot-screen')?.remove();
  const out = document.getElementById('dm-status-line');
  if (out) {
    out.textContent = `Startup error: ${e instanceof Error ? e.message : String(e)}`;
    out.classList.add('dm-status-line--error');
  }
});
