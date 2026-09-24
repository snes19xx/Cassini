// The Grand Finale dives this scene models: one ring-plane crossing plus the
// five atmospheric periapses (the Final Five). Cassini flew 22.

import { RING_CROSSING_T_VALUES } from "@/scenes/cassini/data/phases";

export interface Dive {
  index: number;
  t: number;
  date: string;
  dateMs: number;
  isFinalFive: boolean;
  shieldedByHGA: boolean;
  notes?: string;
}

// One row per modelled crossing
const DIVE_META: ReadonlyArray<{
  date: string;
  dateMs: number;
  isFinalFive: boolean;
  shieldedByHGA: boolean;
  notes?: string;
}> = [
  {
    date: "Aug 7, 2017",
    dateMs: Date.UTC(2017, 7, 7),
    isFinalFive: false,
    shieldedByHGA: true,
    notes: "Last ring-plane crossing",
  },
  {
    date: "Aug 14, 2017",
    dateMs: Date.UTC(2017, 7, 14),
    isFinalFive: true,
    shieldedByHGA: false,
    notes: "Final Five #1, first atmospheric dip",
  },
  {
    date: "Aug 20, 2017",
    dateMs: Date.UTC(2017, 7, 20),
    isFinalFive: true,
    shieldedByHGA: false,
    notes: "Final Five #2",
  },
  {
    date: "Aug 27, 2017",
    dateMs: Date.UTC(2017, 7, 27),
    isFinalFive: true,
    shieldedByHGA: false,
    notes: "Final Five #3, lowest dip",
  },
  {
    date: "Sep 2, 2017",
    dateMs: Date.UTC(2017, 8, 2),
    isFinalFive: true,
    shieldedByHGA: false,
    notes: "Final Five #4",
  },
  {
    date: "Sep 9, 2017",
    dateMs: Date.UTC(2017, 8, 9),
    isFinalFive: true,
    shieldedByHGA: false,
    notes: "Final Five #5, last atmospheric dip",
  },
];

export const DIVES: ReadonlyArray<Dive> = RING_CROSSING_T_VALUES.map(
  (t, i): Dive => {
    const meta = DIVE_META[i]!;
    return {
      index: i + 1,
      t,
      date: meta.date,
      dateMs: meta.dateMs,
      isFinalFive: meta.isFinalFive,
      shieldedByHGA: meta.shieldedByHGA,
      ...(meta.notes !== undefined ? { notes: meta.notes } : {}),
    };
  },
);

export function currentDiveIndex(t: number): number {
  if (t < DIVES[0]!.t - 0.0005) return 0;
  for (let i = DIVES.length - 1; i >= 0; i--) {
    if (t >= DIVES[i]!.t - 0.0005) return i + 1;
  }
  return 0;
}

export function nextDive(t: number): Dive | null {
  for (const d of DIVES) {
    if (t < d.t) return d;
  }
  return null;
}
