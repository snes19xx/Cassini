// Finale sub-phase windows within [0.960, 1.0001].

import { DISINTEGRATION_T_START } from "../../data/missionConstants";

export type FinaleSubphase =
  | "pre"
  | "dives"
  | "final5"
  | "plunge"
  | "plasma"
  | "los";

export const SUBPHASE_THRESHOLDS = {
  pre: 0.960,
  dives: 0.980471,
  final5: 0.993788,
  plunge: DISINTEGRATION_T_START,
  plasma: 0.9999,
  los: 1.0,
} as const;

export function getFinaleSubphase(t: number): FinaleSubphase {
  if (t >= SUBPHASE_THRESHOLDS.los) return "los";
  if (t >= SUBPHASE_THRESHOLDS.plasma) return "plasma";
  if (t >= SUBPHASE_THRESHOLDS.plunge) return "plunge";
  if (t >= SUBPHASE_THRESHOLDS.final5) return "final5";
  if (t >= SUBPHASE_THRESHOLDS.dives) return "dives";
  return "pre";
}

export function getFinaleSubphaseProgress(t: number): number {
  const ph = getFinaleSubphase(t);
  switch (ph) {
    case "pre":    return clamp01((t - SUBPHASE_THRESHOLDS.pre)    / (SUBPHASE_THRESHOLDS.dives  - SUBPHASE_THRESHOLDS.pre));
    case "dives":  return clamp01((t - SUBPHASE_THRESHOLDS.dives)  / (SUBPHASE_THRESHOLDS.final5 - SUBPHASE_THRESHOLDS.dives));
    case "final5": return clamp01((t - SUBPHASE_THRESHOLDS.final5) / (SUBPHASE_THRESHOLDS.plunge - SUBPHASE_THRESHOLDS.final5));
    case "plunge": return clamp01((t - SUBPHASE_THRESHOLDS.plunge) / (SUBPHASE_THRESHOLDS.plasma - SUBPHASE_THRESHOLDS.plunge));
    case "plasma": return clamp01((t - SUBPHASE_THRESHOLDS.plasma) / (SUBPHASE_THRESHOLDS.los    - SUBPHASE_THRESHOLDS.plasma));
    case "los":    return 1;
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function isDiveWindow(t: number): boolean {
  return t >= SUBPHASE_THRESHOLDS.dives && t < SUBPHASE_THRESHOLDS.plunge;
}

export function isFinalPlungeOrLater(t: number): boolean {
  return t >= SUBPHASE_THRESHOLDS.plunge;
}

export function isPlasmaOrLater(t: number): boolean {
  return t >= SUBPHASE_THRESHOLDS.plasma;
}
