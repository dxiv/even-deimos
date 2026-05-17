import {
  type EvenAppBridge,
  type EvenHubEvent,
  CreateStartUpPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  OsEventTypeList,
  RebuildPageContainer,
  StartUpPageCreateResult,
  TextContainerProperty,
  TextContainerUpgrade,
  evenHubEventFromJson,
  readNumber,
  readString,
  toObjectRecord,
} from '@evenrealities/even_hub_sdk';
import { glassesDisplayTextAtOffset } from './agent/tailText';
import type { ProviderPrefs, StreamEvent } from './agent/types';
import { assertDeimosGlassesLayout, deimosGlassesLayout, glassesListItemRowWidth } from './glassesLayout';
import type { LensDisplaySnapshot } from './lensPreview';
import { isSimExitParitySession, offerHubExitSimulatorParityUi } from './simExitParity';

const CONTAINER_LIST = 'deimos_list';
const CONTAINER_MAIN = 'deimos_main';

const ITEM_HEADER = '__header__';
const ITEM_SEND = 'Send';
const ITEM_NEW = 'New';
const ITEM_PROVIDER = 'Provider';
const ITEM_CLEAR = 'Clear';
const ITEM_TOOLS = 'Tools';
const ITEM_EXIT = '< Exit';

const NAV_ROWS: readonly { label: string; action: string }[] = [
  { label: 'Send', action: ITEM_SEND },
  { label: 'New', action: ITEM_NEW },
  { label: 'Setup', action: ITEM_PROVIDER },
  { label: 'Tools', action: ITEM_TOOLS },
  { label: 'Clear', action: ITEM_CLEAR },
  { label: ITEM_EXIT, action: ITEM_EXIT },
];

let bridgeRef: EvenAppBridge | null = null;
let headerLabel = 'Deimos · idle';
let profileLabel = '';
let mainText = 'Ask on phone → read here';
let statusLine = '';
let glassesStarted = false;
let useUpgradeLimit = false;
let textScrollOffset = 0;

let upgradeChain: Promise<void> = Promise.resolve();
let lastUpgradeAt = 0;
let upgradeThrottleMs = 200;

export function setLensUpgradeThrottleMs(ms: number): void {
  upgradeThrottleMs = Math.max(0, Math.min(800, ms));
}

let onListAction: ((action: string) => void) | null = null;
let onRequestSendFromGlasses: (() => void) | null = null;
let onGlassesLensUpdate: ((snap: LensDisplaySnapshot) => void) | null = null;
let lastToolStatus = '';

function combinedDisplayText(): string {
  return mainText + (statusLine ? `\n—\n${statusLine}` : '');
}

function notifyGlassesLens(): void {
  onGlassesLensUpdate?.(getGlassesDisplaySnapshot());
}

function currentTextContent(): string {
  return glassesDisplayTextAtOffset(combinedDisplayText(), useUpgradeLimit, textScrollOffset);
}

function resetTextScroll(): void {
  textScrollOffset = 0;
}

export function scrollGlassesLensText(direction: 'up' | 'down'): void {
  const lines = combinedDisplayText().split('\n');
  const step = 4;
  if (direction === 'down') {
    textScrollOffset = Math.min(textScrollOffset + step, Math.max(0, lines.length - 1));
  } else {
    textScrollOffset = Math.max(0, textScrollOffset - step);
  }
  void pushMainTextUpgrade();
  notifyGlassesLens();
}

export type GlassesInitResult = { ok: true } | { ok: false; error: string };

export function setDeimosBridgeCallbacks(cb: {
  onListAction?: (action: string) => void;
  onRequestSendFromGlasses?: () => void;
  onGlassesLensUpdate?: (snap: LensDisplaySnapshot) => void;
}): void {
  onListAction = cb.onListAction ?? null;
  onRequestSendFromGlasses = cb.onRequestSendFromGlasses ?? null;
  onGlassesLensUpdate = cb.onGlassesLensUpdate ?? null;
}

export function getGlassesDisplaySnapshot(): LensDisplaySnapshot {
  const nav = NAV_ROWS.map((r) => ({ action: r.action, label: r.label }));
  const scrollHint =
    textScrollOffset > 0
      ? 'Scroll lens text ↑↓ · double-tap clears reply'
      : 'Tap menu (same as G2) · scroll long replies on lens';

  return {
    header: headerLabel,
    main: glassesDisplayTextAtOffset(mainText, useUpgradeLimit, textScrollOffset),
    status: statusLine,
    exitConfirm: false,
    nav: [{ action: ITEM_HEADER, label: `> ${headerLabel}` }, ...nav],
    scrollHint,
  };
}

export function applyStreamEventToGlasses(ev: StreamEvent): void {
  switch (ev.type) {
    case 'tool_start':
      lastToolStatus = `tool: ${ev.toolName}${ev.summary ? ` ${ev.summary}` : ''}`;
      statusLine = lastToolStatus;
      void pushMainTextUpgrade();
      notifyGlassesLens();
      break;
    case 'tool_result':
      statusLine = ev.isError ? `err: ${ev.toolName}` : `done: ${ev.toolName}`;
      notifyGlassesLens();
      break;
    case 'action_required':
      statusLine = 'waiting for you';
      notifyGlassesLens();
      break;
    default:
      break;
  }
}

export function cycleToolStatusOnGlasses(): void {
  statusLine = lastToolStatus || statusLine || 'no tools yet';
  void pushMainTextUpgrade();
  notifyGlassesLens();
}

function listItemNames(): string[] {
  return [headerLabel, ...NAV_ROWS.map((r) => r.label)];
}

function navList(): ListContainerProperty {
  const L = deimosGlassesLayout().list;
  const names = listItemNames();
  return new ListContainerProperty({
    xPosition: L.x,
    yPosition: L.y,
    width: L.w,
    height: L.h,
    borderWidth: L.borderWidth,
    borderColor: L.borderColor,
    borderRadius: L.borderRadius,
    paddingLength: L.paddingLength,
    containerID: 1,
    containerName: CONTAINER_LIST,
    itemContainer: new ListItemContainerProperty({
      itemCount: names.length,
      itemWidth: glassesListItemRowWidth(L),
      isItemSelectBorderEn: 1,
      itemName: names,
    }),
    isEventCapture: 1,
  });
}

function mainTextContainer(): TextContainerProperty {
  const T = deimosGlassesLayout().text;
  return new TextContainerProperty({
    xPosition: T.x,
    yPosition: T.y,
    width: T.w,
    height: T.h,
    borderWidth: T.borderWidth,
    borderColor: T.borderColor,
    borderRadius: T.borderRadius,
    paddingLength: T.paddingLength,
    containerID: 2,
    containerName: CONTAINER_MAIN,
    content: currentTextContent(),
    /** Simulator + firmware allow only one capture container per page (list owns gestures). */
    isEventCapture: 0,
  });
}

function startupLayout(): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: 2,
    listObject: [navList()],
    textObject: [mainTextContainer()],
  });
}

async function rebuildGlassesPage(): Promise<boolean> {
  const b = bridgeRef;
  if (!b) return false;
  return b.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 2,
      listObject: [navList()],
      textObject: [mainTextContainer()],
    }),
  );
}

async function pushMainTextUpgrade(): Promise<void> {
  const b = bridgeRef;
  if (!b || !glassesStarted) return;
  const now = Date.now();
  const throttle = upgradeThrottleMs <= 0 ? 0 : upgradeThrottleMs;
  if (throttle > 0 && now - lastUpgradeAt < throttle) return;
  lastUpgradeAt = now;
  useUpgradeLimit = true;
  const content = currentTextContent();
  upgradeChain = upgradeChain.then(async () => {
    await b.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: 2,
        containerName: CONTAINER_MAIN,
        contentOffset: 0,
        contentLength: content.length,
        content,
      }),
    );
  });
  await upgradeChain;
}

export function setGlassesHeader(
  prefs: ProviderPrefs | null,
  state: 'idle' | 'thinking' | 'streaming' | 'error',
  activeProfileName?: string,
): void {
  profileLabel = activeProfileName?.trim() || '';
  const model = prefs?.model?.trim() || 'no model';
  const shortModel = model.length > 12 ? model.slice(0, 11) + '…' : model;
  const stateLabel =
    state === 'thinking' ? 'thinking' : state === 'streaming' ? 'live' : state === 'error' ? 'error' : 'idle';
  headerLabel = profileLabel ? `${stateLabel} · ${profileLabel}` : `${stateLabel} · ${shortModel}`;
  void rebuildGlassesPage();
  notifyGlassesLens();
}

export function setGlassesMainText(text: string): void {
  mainText = text || ' ';
  void pushMainTextUpgrade();
  notifyGlassesLens();
}

export function setGlassesStatus(text: string): void {
  statusLine = text;
  void pushMainTextUpgrade();
  notifyGlassesLens();
}

export function setGlassesIdleHint(): void {
  mainText = 'Ask on phone → read here';
  statusLine = '';
  useUpgradeLimit = false;
  resetTextScroll();
  headerLabel = 'idle';
  void rebuildGlassesPage();
  notifyGlassesLens();
}

export function appendGlassesStream(delta: string, fullSoFar: string): void {
  mainText = fullSoFar || delta;
  void pushMainTextUpgrade();
  notifyGlassesLens();
}

export function requestHubExitWithConfirmation(explicitBridge?: EvenAppBridge | null): void {
  const b = explicitBridge ?? bridgeRef;
  if (!b) return;
  void (async () => {
    try {
      await b.shutDownPageContainer(1);
    } catch {
      /* host may throw */
    }
    if (isSimExitParitySession()) offerHubExitSimulatorParityUi(b);
  })();
}

function eqName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function matchRow(trimmed: string): string | undefined {
  const names = listItemNames();
  const exact = names.find((n) => eqName(n, trimmed));
  if (exact) {
    const row = NAV_ROWS.find((r) => eqName(r.label, exact));
    if (row) return row.action;
    if (eqName(exact, headerLabel)) return ITEM_HEADER;
  }
  const tl = trimmed.toLowerCase();
  if (tl.startsWith('sen')) return ITEM_SEND;
  if (tl.startsWith('new')) return ITEM_NEW;
  if (tl.startsWith('pro') || tl.startsWith('set')) return ITEM_PROVIDER;
  if (tl.startsWith('too')) return ITEM_TOOLS;
  if (tl.startsWith('cle')) return ITEM_CLEAR;
  if (tl.startsWith('ex') || tl.startsWith('<')) return ITEM_EXIT;
  return undefined;
}

function readListSelectName(rec: Record<string, unknown>): string {
  const name = readString(rec, 'currentSelectItemName') ?? readString(rec, 'itemName') ?? '';
  return name.trim();
}

function readListSelectIndex(rec: Record<string, unknown>): number | undefined {
  const idx = readNumber(rec, 'currentSelectIndex');
  return typeof idx === 'number' && Number.isFinite(idx) ? idx : undefined;
}

function resolvedListItemName(listRec: Record<string, unknown>): string | undefined {
  const trimmed = readListSelectName(listRec);
  if (trimmed) {
    const m = matchRow(trimmed);
    if (m) return m;
  }
  const idx = readListSelectIndex(listRec);
  const names = listItemNames();
  if (idx !== undefined && idx >= 0 && idx < names.length) {
    const label = names[idx];
    return matchRow(label) ?? (eqName(label, headerLabel) ? ITEM_HEADER : undefined);
  }
  return undefined;
}

function normalizeEvent(incoming: unknown): EvenHubEvent {
  if (incoming && typeof incoming === 'object' && 'listEvent' in incoming) {
    return incoming as EvenHubEvent;
  }
  const r = toObjectRecord(incoming);
  if (r.data && typeof r.data === 'object') return evenHubEventFromJson(r.data);
  if (r.method === 'evenHubEvent' && r.data) return evenHubEventFromJson(r.data);
  return evenHubEventFromJson(incoming);
}

function parseListEventType(rec: Record<string, unknown>): OsEventTypeList | undefined {
  const raw = readNumber(rec, 'eventType') ?? readNumber(rec, 'type');
  if (raw === undefined) return undefined;
  return raw as OsEventTypeList;
}

function handleTextScrollEvent(et: OsEventTypeList | undefined): boolean {
  if (et === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    scrollGlassesLensText('down');
    return true;
  }
  if (et === OsEventTypeList.SCROLL_TOP_EVENT) {
    scrollGlassesLensText('up');
    return true;
  }
  return false;
}

function handleListSelection(name: string): void {
  if (name === ITEM_HEADER) return;

  if (eqName(name, ITEM_EXIT)) {
    requestHubExitWithConfirmation();
    return;
  }

  if (eqName(name, ITEM_TOOLS)) {
    cycleToolStatusOnGlasses();
    return;
  }

  onListAction?.(name);

  if (eqName(name, ITEM_SEND)) onRequestSendFromGlasses?.();
}

function handleDoubleTap(): void {
  if (mainText.trim() === 'Ask on phone → read here' || !mainText.trim()) {
    requestHubExitWithConfirmation();
    return;
  }
  resetTextScroll();
  setGlassesIdleHint();
  onListAction?.(ITEM_NEW);
}

function startupFailureMessage(code: StartUpPageCreateResult): string {
  switch (code) {
    case StartUpPageCreateResult.success:
      return 'ok';
    default:
      return `G2 startup failed (${code})`;
  }
}

export async function runDeimosOnBridge(bridge: EvenAppBridge): Promise<GlassesInitResult> {
  bridgeRef = bridge;
  assertDeimosGlassesLayout();

  const created = await bridge.createStartUpPageContainer(startupLayout());
  if (created !== StartUpPageCreateResult.success) {
    bridgeRef = null;
    glassesStarted = false;
    return { ok: false, error: startupFailureMessage(created) };
  }

  glassesStarted = true;
  useUpgradeLimit = false;
  resetTextScroll();
  notifyGlassesLens();

  bridge.onEvenHubEvent((incoming) => {
    const event = normalizeEvent(incoming);
    const listRec = event.listEvent
      ? toObjectRecord(event.listEvent as unknown as Record<string, unknown>)
      : null;

    const textRec = event.textEvent
      ? toObjectRecord(event.textEvent as unknown as Record<string, unknown>)
      : null;
    if (textRec) {
      const textEt = parseListEventType(textRec);
      if (textEt === OsEventTypeList.DOUBLE_CLICK_EVENT) {
        handleDoubleTap();
        return;
      }
      if (handleTextScrollEvent(textEt)) return;
    }

    if (!listRec || Object.keys(listRec).length === 0) return;
    const listEt = parseListEventType(listRec);
    if (listEt === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      handleDoubleTap();
      return;
    }
    if (handleTextScrollEvent(listEt)) return;

    const name = resolvedListItemName(listRec);
    if (!name) return;
    handleListSelection(name);
  });

  return { ok: true };
}

export function hasGlassesBridge(): boolean {
  return bridgeRef !== null && glassesStarted;
}
