// 22 Grand Finale dives: 17 ring crossings + 5 atmospheric periapses (the Final Five).

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

const DIVE_META: ReadonlyArray<{
  date: string;
  dateMs: number;
  isFinalFive: boolean;
  shieldedByHGA: boolean;
  notes?: string;
}> = [
  { date: "Apr 26, 2017", dateMs: Date.UTC(2017, 3, 26), isFinalFive: false, shieldedByHGA: true,  notes: "First ring dive -- HGA shielded" },
  { date: "May 2, 2017",  dateMs: Date.UTC(2017, 4, 2),  isFinalFive: false, shieldedByHGA: true  },
  { date: "May 9, 2017",  dateMs: Date.UTC(2017, 4, 9),  isFinalFive: false, shieldedByHGA: true,  notes: "Downlinked during crossing" },
  { date: "May 15, 2017", dateMs: Date.UTC(2017, 4, 15), isFinalFive: false, shieldedByHGA: true,  notes: "Downlinked during crossing" },
  { date: "May 22, 2017", dateMs: Date.UTC(2017, 4, 22), isFinalFive: false, shieldedByHGA: true,  notes: "Downlinked during crossing" },
  { date: "May 28, 2017", dateMs: Date.UTC(2017, 4, 28), isFinalFive: false, shieldedByHGA: true,  notes: "Farthest venture into D ring" },
  { date: "Jun 4, 2017",  dateMs: Date.UTC(2017, 5, 4),  isFinalFive: false, shieldedByHGA: true,  notes: "Second-closest D-ring pass" },
  { date: "Jun 10, 2017", dateMs: Date.UTC(2017, 5, 10), isFinalFive: false, shieldedByHGA: true,  notes: "Downlinked during crossing" },
  { date: "Jun 16, 2017", dateMs: Date.UTC(2017, 5, 16), isFinalFive: false, shieldedByHGA: true  },
  { date: "Jun 23, 2017", dateMs: Date.UTC(2017, 5, 23), isFinalFive: false, shieldedByHGA: true,  notes: "Downlinked during crossing" },
  { date: "Jun 29, 2017", dateMs: Date.UTC(2017, 5, 29), isFinalFive: false, shieldedByHGA: false, notes: "D-ring entry -- unshielded" },
  { date: "Jul 6, 2017",  dateMs: Date.UTC(2017, 6, 6),  isFinalFive: false, shieldedByHGA: true,  notes: "Ventured into D ring" },
  { date: "Jul 12, 2017", dateMs: Date.UTC(2017, 6, 12), isFinalFive: false, shieldedByHGA: true  },
  { date: "Jul 19, 2017", dateMs: Date.UTC(2017, 6, 19), isFinalFive: false, shieldedByHGA: true,  notes: "Downlinked during crossing" },
  { date: "Jul 25, 2017", dateMs: Date.UTC(2017, 6, 25), isFinalFive: false, shieldedByHGA: true  },
  { date: "Aug 1, 2017",  dateMs: Date.UTC(2017, 7, 1),  isFinalFive: false, shieldedByHGA: true  },
  { date: "Aug 7, 2017",  dateMs: Date.UTC(2017, 7, 7),  isFinalFive: false, shieldedByHGA: true  },
  { date: "Aug 14, 2017", dateMs: Date.UTC(2017, 7, 14), isFinalFive: true,  shieldedByHGA: false, notes: "Final Five #1 -- first atmospheric dip" },
  { date: "Aug 20, 2017", dateMs: Date.UTC(2017, 7, 20), isFinalFive: true,  shieldedByHGA: false, notes: "Final Five #2" },
  { date: "Aug 27, 2017", dateMs: Date.UTC(2017, 7, 27), isFinalFive: true,  shieldedByHGA: false, notes: "Final Five #3 -- lowest dip" },
  { date: "Sep 2, 2017",  dateMs: Date.UTC(2017, 8, 2),  isFinalFive: true,  shieldedByHGA: false, notes: "Final Five #4" },
  { date: "Sep 9, 2017",  dateMs: Date.UTC(2017, 8, 9),  isFinalFive: true,  shieldedByHGA: false, notes: "Final Five #5 -- last atmospheric dip" },
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
