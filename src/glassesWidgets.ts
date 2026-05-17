/**
 * Placeholder for Even Hub widget APIs when SDK exposes background + widget control.
 * See Phase 5 roadmap — enable via ?widgets=1 for future wiring.
 */

export function widgetsFeatureEnabled(): boolean {
  try {
    return /[?&]widgets(?:=1|=true)?(?:&|$)/.test(window.location.search);
  } catch {
    return false;
  }
}

export function initGlassesWidgetsStub(): void {
  if (!widgetsFeatureEnabled()) return;
  if (import.meta.env.DEV) {
    console.info('[Deimos] glasses widgets stub active — awaiting Even Hub SDK APIs');
  }
}
