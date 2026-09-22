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

export const ARRIVAL_RADIUS_START = 12000;
export const ARRIVAL_RADIUS_END = 620;

// Ratio of actual to scripted camera distance past which the driver snaps.
export const ARRIVAL_SNAP_RATIO = 1.6;

/** Camera distance to Saturn's centre at progress p. */
export function arrivalRadius(p: number): number {
  const f = clamp01(p);
  // Geometric interpolation: apparent size grows at a constant relative rate.
  return ARRIVAL_RADIUS_START * Math.pow(ARRIVAL_RADIUS_START / ARRIVAL_RADIUS_END, f);
}
