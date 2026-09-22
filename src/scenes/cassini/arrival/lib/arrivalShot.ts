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

export const ARRIVAL_POLAR_START_DEG = 85;
export const ARRIVAL_POLAR_END_DEG = 58;

export const ARRIVAL_ROLL_START_DEG = 0;
export const ARRIVAL_ROLL_END_DEG = 26.73;

const DEG = Math.PI / 180;

/** Camera polar angle from +Y, in radians, at progress p. */
export function arrivalPolarRad(p: number): number {
  const f = clamp01(p);
  return (
    (ARRIVAL_POLAR_START_DEG + (ARRIVAL_POLAR_END_DEG - ARRIVAL_POLAR_START_DEG) * f) * DEG
  );
}

/** Saturn group roll about world Z, in degrees, at progress p. */
export function arrivalRollDeg(p: number): number {
  const f = clamp01(p);
  return ARRIVAL_ROLL_START_DEG + (ARRIVAL_ROLL_END_DEG - ARRIVAL_ROLL_START_DEG) * f;
}

/** Saturn group roll about world Z, in radians, at progress p. */
export function arrivalRollRad(p: number): number {
  return arrivalRollDeg(p) * DEG;
}
