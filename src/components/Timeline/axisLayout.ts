import { BRACKETS, STOPS, YEARS, axisX, bracketMembers } from "./axisModel";

export const GEO = {
  /** Height of the annotation block above the axis line. */
  annH: 56,
  /** Baselines measured up from the axis line. */
  memberBottom: 8,
  bracketBottom: 32,
  chapterBottom: 36,
  rowStep: 15,
  memberGap: 6,
  chapterGap: 10,
  /** How far an end label may hang into the bar's own padding. */
  edge: 40,
  /** Horizontal room a year needs before it earns a label. */
  yearGap: 46,
  yearInset: 12,
};

export interface Slot {
  x: number;
  bottom: number;
  hidden: boolean;
  /** SVG path for the stem or bracket under the label. */
  stem: string;
}

export interface AxisLayout {
  width: number;
  annH: number;
  slots: Record<string, Slot>;
  years: { year: number; x: number; labeled: boolean }[];
}

interface Item {
  key: string;
  x: number;
  w: number;
  row: number;
  hidden: boolean;
  /** Bracket ends, in px. */
  a: number;
  z: number;
}

// Fills the front row first, dropping only a colliding label to the second.
function packRows(items: Item[], width: number, gap: number): boolean {
  const right = [-Infinity, -Infinity];
  let staggered = false;
  for (const it of items) {
    const lo = it.x - it.w / 2;
    const hi = it.x + it.w / 2;
    if (lo < -GEO.edge || hi > width + GEO.edge) {
      it.hidden = true;
      continue;
    }
    const row = lo >= right[0]! + gap ? 0 : lo >= right[1]! ? 1 : -1;
    if (row < 0) {
      it.hidden = true;
      continue;
    }
    it.row = row;
    right[row] = hi;
    if (row === 1) staggered = true;
  }
  return staggered;
}

/** Hides any label that overlaps a kept one or runs off the end. */
function placeRow(items: Item[], width: number, gap: number): void {
  const kept: [number, number][] = [];
  for (const it of items) {
    const lo = it.x - it.w / 2;
    const hi = it.x + it.w / 2;
    const offEnd = lo < -GEO.edge || hi > width + GEO.edge;
    const clash = kept.some(([a, b]) => lo < b + gap && hi > a - gap);
    it.hidden = offEnd || clash;
    if (!it.hidden) kept.push([lo, hi]);
  }
}

/** Pixel slots for every label, bracket and year at this bar width. */
export function computeAxisLayout(
  width: number,
  widths: Record<string, number>,
): AxisLayout {
  const item = (key: string, x: number, a = x, z = x): Item => ({
    key,
    x,
    w: widths[key] ?? 0,
    row: 0,
    hidden: false,
    a,
    z,
  });

  const brackets = BRACKETS.map((b) => {
    const members = bracketMembers(b.id);
    const a = axisX(members[0]!.t) * width;
    const z = axisX(members[members.length - 1]!.t) * width;
    return item(b.id, (a + z) / 2, a, z);
  });

  const byX = (a: Item, b: Item) => a.x - b.x;
  const stopItem = (s: (typeof STOPS)[number]) =>
    item(s.id, axisX(s.t) * width);
  const chapterRow = brackets
    .concat(STOPS.filter((s) => s.tier === "chapter").map(stopItem))
    .sort(byX);
  const memberRow = STOPS.filter((s) => s.tier === "member")
    .map(stopItem)
    .sort(byX);

  const stagger = packRows(memberRow, width, GEO.memberGap);
  const extra = stagger ? GEO.rowStep : 0;

  placeRow(chapterRow, width, GEO.chapterGap);

  const annH = GEO.annH + extra;
  const slots: Record<string, Slot> = {};

  for (const it of memberRow) {
    const bottom = GEO.memberBottom + it.row * GEO.rowStep;
    const top = it.hidden ? annH - 7 : annH - bottom;
    slots[it.key] = {
      x: it.x,
      bottom,
      hidden: it.hidden,
      stem: `M ${it.x} ${top} L ${it.x} ${annH}`,
    };
  }

  const chapterBottom = GEO.chapterBottom + extra;
  const bracketY = annH - (GEO.bracketBottom + extra);
  for (const it of chapterRow) {
    const isBracket = it.a !== it.z;
    const top = it.hidden ? annH - 7 : annH - chapterBottom;
    slots[it.key] = {
      x: it.x,
      bottom: chapterBottom,
      hidden: it.hidden,
      stem: isBracket
        ? `M ${it.a} ${bracketY + 5} L ${it.a} ${bracketY} L ${it.z} ${bracketY} L ${it.z} ${bracketY + 5}`
        : `M ${it.x} ${top} L ${it.x} ${annH}`,
    };
  }

  let lastLabel = -Infinity;
  const years = YEARS.map(({ year, t }) => {
    const x = axisX(t) * width;
    const labeled =
      x - lastLabel >= GEO.yearGap &&
      x >= GEO.yearInset &&
      x <= width - GEO.yearInset;
    if (labeled) lastLabel = x;
    return { year, x, labeled };
  });

  return { width, annH, slots, years };
}
