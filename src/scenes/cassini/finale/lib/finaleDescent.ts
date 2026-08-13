// src/scenes/cassini/finale/lib/finaleDescent.ts
//
// Camera shot schedule for the terminal plunge. Progress is measured in
// displayT so the cuts land on the same T+ seconds the timer shows.

import {
  isTerminalTableau,
  TERMINAL_T_START,
} from "../../data/missionConstants";
import { missionToDisplay } from "../../lib/tRemap";

const TERMINAL_T_END = 1.0001; // finale_disintegration tEnd
const DISPLAY_START = missionToDisplay(TERMINAL_T_START);
const DISPLAY_END = missionToDisplay(TERMINAL_T_END);

export { isTerminalTableau };

/** Descent progress across both terminal tableaus, clamped to 0..1. */
export function getDescentProgress(t: number): number {
  const span = DISPLAY_END - DISPLAY_START;
  if (span <= 0) return 0;
  const p = (missionToDisplay(t) - DISPLAY_START) / span;
  return Math.max(0, Math.min(1, p));
}

export type FinaleShotId = "skim" | "chase" | "meteor";

interface ShotEntry {
  id: FinaleShotId;
  start: number;
  end: number;
}

// skim is the wide establishing shot, chase follows close behind as the craft
// heats up, meteor pans out as it breaks into a streak.
export const SHOT_SCHEDULE: ShotEntry[] = [
  { id: "skim", start: 0.0, end: 0.5 },
  { id: "chase", start: 0.5, end: 0.82 },
  { id: "meteor", start: 0.82, end: 1.01 },
];

/** Active shot, plus progress within that shot. */
export function getFinaleShot(p: number): {
  shot: FinaleShotId;
  localP: number;
} {
  for (const s of SHOT_SCHEDULE) {
    if (p < s.end) {
      const localP = Math.max(0, Math.min(1, (p - s.start) / (s.end - s.start)));
      return { shot: s.id, localP };
    }
  }
  return { shot: "meteor", localP: 1 };
}
