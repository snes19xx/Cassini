// src/scenes/cassini/arrival/lib/arrivalShot.ts
//
// Saturn orbit insertion approach, as pure functions of mission t.

export const ARRIVAL_TABLEAU_ID = "saturn_arrival";

export function isArrivalTableau(id: string): boolean {
  return id === ARRIVAL_TABLEAU_ID;
}

export const ARRIVAL_T_START = 0.18;
export const ARRIVAL_T_END = 0.353;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Mission t to progress through the arrival window, clamped to [0, 1]. */
export function arrivalProgress(t: number): number {
  return clamp01((t - ARRIVAL_T_START) / (ARRIVAL_T_END - ARRIVAL_T_START));
}
