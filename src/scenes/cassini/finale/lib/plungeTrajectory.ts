// src/scenes/cassini/finale/lib/plungeTrajectory.ts
//
// Terminal fall, spanning both finale_atmospheric and finale_disintegration.

import * as THREE from "three";
import { TERMINAL_T_START } from "../../data/missionConstants";
import type { RingDiveSample } from "./ringDiveTrajectory";
import { CAM_BASE, useCassiniDebugStore } from "./cassiniDebug";

const TABLEAU_T_START = TERMINAL_T_START;
const TABLEAU_T_END = 1.0001;

// Fallback heading for when the finite-difference velocity degenerates.
export const PLUNGE_ENTRY_FORWARD = new THREE.Vector3(0, 0, 1);
export const PLUNGE_ENTRY_DIR = new THREE.Vector3(0, 1, 0);

function worldFromScreen(
  distance: number,
  right: number,
  up: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  out.set(CAM_BASE.x + distance, CAM_BASE.y + up, CAM_BASE.z + right);
  return out;
}

const _entry = new THREE.Vector3();
const _exit = new THREE.Vector3();

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function samplePosition(t: number, out: THREE.Vector3): void {
  const tc = Math.max(TABLEAU_T_START, Math.min(TABLEAU_T_END, t));
  const p = clamp01((tc - TABLEAU_T_START) / (TABLEAU_T_END - TABLEAU_T_START));
  const s = useCassiniDebugStore.getState();
  const pe = s.speedEase === 1 ? p : Math.pow(p, s.speedEase);
  worldFromScreen(s.distance, s.entryRight, s.entryUp, _entry);
  worldFromScreen(s.distance, s.exitRight, s.exitUp, _exit);
  out.lerpVectors(_entry, _exit, pe);
}

const _scratchA = new THREE.Vector3();
const _scratchB = new THREE.Vector3();
const _defaultOut: RingDiveSample = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
};
const VEL_EPSILON = 0.0001;

/**
 * Position and unit velocity tangent at mission-time `t`. Velocity comes from
 * a finite difference, one-sided at the window edges.
 */
export function getPlungeSample(
  t: number,
  out?: RingDiveSample,
): RingDiveSample {
  const sample = out ?? _defaultOut;
  samplePosition(t, sample.position);

  const tMinus = Math.max(TABLEAU_T_START, t - VEL_EPSILON);
  const tPlus = Math.min(TABLEAU_T_END, t + VEL_EPSILON);
  samplePosition(tMinus, _scratchA);
  samplePosition(tPlus, _scratchB);
  sample.velocity.subVectors(_scratchB, _scratchA);
  const len = sample.velocity.length();
  if (len > 1e-8) sample.velocity.multiplyScalar(1 / len);
  else sample.velocity.copy(PLUNGE_ENTRY_FORWARD);

  return sample;
}

export function getPlungeCassiniPos(
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  samplePosition(t, out);
  return out;
}

/**
 * Endpoints of the straight plunge line. The path is lerp(entry, exit, f), so
 * projecting any point on it back onto the line recovers its f, which is how
 * the break-up sheds debris along the route instead of all at one instant.
 */
export function getPlungeEndpoints(
  entryOut: THREE.Vector3,
  exitOut: THREE.Vector3,
): void {
  const s = useCassiniDebugStore.getState();
  worldFromScreen(s.distance, s.entryRight, s.entryUp, entryOut);
  worldFromScreen(s.distance, s.exitRight, s.exitUp, exitOut);
}
