// Mission t -> axis x, and back. Chapter shares set how much of the bar
// each one takes and sum to 1.

import { dateMsToT } from "@/scenes/cassini/data/missionDates";
import { JUMP_TO_TABLEAU, TABLEAUS } from "@/scenes/cassini/data/tableaus";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const BY_ID = new Map(TABLEAUS.map((tab) => [tab.id, tab]));

function tableau(id: string) {
  const tab = BY_ID.get(id);
  if (!tab) throw new Error(`axisModel: no tableau "${id}"`);
  return tab;
}

export interface Chapter {
  id: string;
  label: string;
  t0: number;
  t1: number;
  x0: number;
  x1: number;
  share: number;
}

const CHAPTER_SPECS = [
  {
    id: "cruise",
    label: "CRUISE",
    from: "cruise_early",
    to: "cruise_early",
    share: 0.1,
  },
  {
    id: "saturn",
    label: "SATURN",
    from: "saturn_arrival",
    to: "saturn_arrival",
    share: 0.11,
  },
  {
    id: "titan",
    label: "TITAN",
    from: "titan_huygens",
    to: "titan_huygens",
    share: 0.08,
  },
  {
    id: "tour",
    label: "ICY MOONS",
    from: "enceladus",
    to: "rhea",
    share: 0.38,
  },
  {
    id: "port",
    label: "PORTRAITS",
    from: "family_portrait",
    to: "three_crescents",
    share: 0.18,
  },
  {
    id: "finale",
    label: "GRAND FINALE",
    from: "finale_approach",
    to: "finale_disintegration",
    share: 0.15,
  },
] as const;

export const CHAPTERS: Chapter[] = (() => {
  let x = 0;
  return CHAPTER_SPECS.map((spec) => {
    const chapter: Chapter = {
      id: spec.id,
      label: spec.label,
      t0: tableau(spec.from).tStart,
      t1: Math.min(1, tableau(spec.to).tEnd),
      x0: x,
      x1: x + spec.share,
      share: spec.share,
    };
    x = chapter.x1;
    return chapter;
  });
})();

const LAST = CHAPTERS[CHAPTERS.length - 1]!;

export function axisX(t: number): number {
  const tc = clamp01(t);
  for (const c of CHAPTERS) {
    if (tc <= c.t1 || c === LAST) {
      return c.x0 + ((tc - c.t0) / (c.t1 - c.t0)) * c.share;
    }
  }
  return tc;
}

export function axisT(x: number): number {
  const xc = clamp01(x);
  for (const c of CHAPTERS) {
    if (xc <= c.x1 || c === LAST) {
      return clamp01(c.t0 + ((xc - c.x0) / c.share) * (c.t1 - c.t0));
    }
  }
  return 0;
}

export type StopTier = "chapter" | "member";

export interface Stop {
  /** Tableau this label jumps to. */
  id: string;
  label: string;
  /** Where the mark sits on the axis. */
  t: number;
  /** Where a click lands. */
  jumpT: number;
  tier: StopTier;
  bracket: string | null;
}

const STOP_SPECS: {
  jump: string;
  label: string;
  tier: StopTier;
  bracket: string | null;
}[] = [
  { jump: "SATURN", label: "SATURN", tier: "chapter", bracket: null },
  { jump: "TITAN", label: "TITAN", tier: "chapter", bracket: null },
  { jump: "ENCELADUS", label: "ENCELADUS", tier: "member", bracket: "tour" },
  { jump: "IAPETUS", label: "IAPETUS", tier: "member", bracket: "tour" },
  { jump: "MIMAS", label: "MIMAS", tier: "member", bracket: "tour" },
  { jump: "TETHYS", label: "TETHYS", tier: "member", bracket: "tour" },
  { jump: "DIONE", label: "DIONE", tier: "member", bracket: "tour" },
  { jump: "RHEA", label: "RHEA", tier: "member", bracket: "tour" },
  { jump: "FAMILY", label: "FAMILY", tier: "member", bracket: "port" },
  { jump: "CRESCENTS", label: "CRESCENTS", tier: "member", bracket: "port" },
  { jump: "FINALE", label: "FINAL DIVES", tier: "member", bracket: "finale" },
  {
    jump: "ATMOSPHERE",
    label: "FINAL PLUNGE",
    tier: "member",
    bracket: "finale",
  },
];

export const STOPS: Stop[] = STOP_SPECS.map((spec) => {
  const id = JUMP_TO_TABLEAU[spec.jump];
  if (!id) throw new Error(`axisModel: no JUMP_TO_TABLEAU.${spec.jump}`);
  const tab = tableau(id);
  return {
    id,
    label: spec.label,
    t: tab.tStart,
    // A hair past tStart keeps getActiveTableau off the previous tableau.
    jumpT: tab.jumpT ?? tab.tStart + 1e-5,
    tier: spec.tier,
    bracket: spec.bracket,
  };
}).sort((a, b) => a.t - b.t);

export const BRACKETS: Chapter[] = CHAPTERS.filter(
  (c) => STOPS.filter((s) => s.bracket === c.id).length > 1,
);

export function bracketMembers(id: string): Stop[] {
  return STOPS.filter((s) => s.bracket === id);
}

export const YEARS: { year: number; t: number }[] = Array.from(
  { length: 2017 - 1998 + 1 },
  (_, i) => ({ year: 1998 + i, t: dateMsToT(Date.UTC(1998 + i, 0, 1)) }),
);

/** Last destination the playhead has passed, or null before the first. */
export function stopAt(t: number): Stop | null {
  let hit: Stop | null = null;
  for (const s of STOPS) if (t >= s.t) hit = s;
  return hit;
}
