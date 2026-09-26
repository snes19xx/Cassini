// Packs the destination labels above the axis: measured label widths in,
// pixel positions out. Pure, and testable without a DOM.

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
