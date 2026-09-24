// src/scenes/cassini/lib/huygensDescent.ts
//
// The Huygens descent path as a pure function of mission t, read by both the
// probe model and the camera tracking it.

import { HUYGENS_SEPARATION_T } from "../data/missionConstants";

/** Structural target so THREE.Vector3 passes without importing three. */
export interface Vec3Out {
  x: number;
  y: number;
  z: number;
}

/** Spring release off the bus. */
export const SEP_START = HUYGENS_SEPARATION_T;
/** Probe reaches Titan. Position is pinned to the origin from here on. */
export const TOUCHDOWN = 0.395;
/** Opacity hits zero. */
export const FADE_END = 0.4;

/** [0,1] across SEP_START..TOUCHDOWN. */
export function descentProgress(t: number): number {
  return Math.min(1, Math.max(0, (t - SEP_START) / (TOUCHDOWN - SEP_START)));
}

/** True while the probe is still a visible object, falling or fading. */
export function isDescending(t: number): boolean {
  return t >= SEP_START && t <= FADE_END;
}

/** Probe world position. Titan sits at the origin, so the fall targets zero. */
export function getHuygensPos(
  t: number,
  startOffset: readonly [number, number, number],
  out: Vec3Out,
): Vec3Out {
  const p = descentProgress(t);
  const fallEase = Math.pow(p, 2.2);
  const lateralBump = Math.sin(p * Math.PI) * 4.0;

  out.x = startOffset[0] * (1 - fallEase) + -lateralBump * 0.4;
  out.y = startOffset[1] * (1 - fallEase) - lateralBump * 0.6;
  out.z = startOffset[2] * (1 - fallEase) - lateralBump * 0.3;
  return out;
}
