const G2_PANEL_W = 576;
const G2_PANEL_H = 288;

const GLASSES_MARGIN_TOP = 6;
const GLASSES_LIST_X = 5;
const GLASSES_LIST_Y = GLASSES_MARGIN_TOP;
const GLASSES_LIST_W = 168;
const GLASSES_GAP_LIST_TEXT = 5;
const GLASSES_TEXT_RIGHT_PAD = 4;
const GLASSES_LIST_BORDER_W = 1;
const GLASSES_LIST_BORDER_COLOR = 4;
const GLASSES_LIST_RADIUS = 3;
const GLASSES_LIST_PAD = 6;
const GLASSES_TEXT_BORDER_W = 1;
const GLASSES_TEXT_BORDER_COLOR = 6;
const GLASSES_TEXT_RADIUS = 3;
const GLASSES_TEXT_PAD = 7;

export type GlassesListRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  borderWidth: number;
  borderColor: number;
  borderRadius: number;
  paddingLength: number;
};

export type GlassesTextRect = GlassesListRect;

export function glassesListItemRowWidth(list: GlassesListRect): number {
  const inner = Math.max(0, list.w - 2 * list.paddingLength);
  const gutter = 6;
  return Math.max(36, inner - gutter);
}

/** Deimos: left nav list + large right text pane (no image). */
export function deimosGlassesLayout(): { list: GlassesListRect; text: GlassesTextRect } {
  const listColumnTop = GLASSES_LIST_Y;
  const listColumnBottom = G2_PANEL_H - 4;
  const listH = Math.max(1, listColumnBottom - listColumnTop);

  const list: GlassesListRect = {
    x: GLASSES_LIST_X,
    y: listColumnTop,
    w: GLASSES_LIST_W,
    h: listH,
    borderWidth: GLASSES_LIST_BORDER_W,
    borderColor: GLASSES_LIST_BORDER_COLOR,
    borderRadius: GLASSES_LIST_RADIUS,
    paddingLength: GLASSES_LIST_PAD,
  };

  const textLeft = GLASSES_LIST_X + GLASSES_LIST_W + GLASSES_GAP_LIST_TEXT;
  const textTop = GLASSES_LIST_Y;
  const textW = Math.max(80, G2_PANEL_W - textLeft - GLASSES_TEXT_RIGHT_PAD);
  const textH = Math.max(40, G2_PANEL_H - textTop - 4);

  const text: GlassesTextRect = {
    x: textLeft,
    y: textTop,
    w: textW,
    h: textH,
    borderWidth: GLASSES_TEXT_BORDER_W,
    borderColor: GLASSES_TEXT_BORDER_COLOR,
    borderRadius: GLASSES_TEXT_RADIUS,
    paddingLength: GLASSES_TEXT_PAD,
  };

  return { list, text };
}

export function assertDeimosGlassesLayout(): void {
  const { list, text } = deimosGlassesLayout();
  const errs: string[] = [];
  if (list.x + list.w > text.x) errs.push('list overlaps text');
  if (text.x + text.w > G2_PANEL_W) errs.push('text exceeds panel width');
  if (text.y + text.h > G2_PANEL_H) errs.push('text exceeds panel height');
  if (errs.length) throw new Error(`Deimos glasses layout invalid:\n${errs.join('\n')}`);
}
