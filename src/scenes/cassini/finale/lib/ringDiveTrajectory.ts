// src/scenes/cassini/finale/lib/ringDiveTrajectory.ts
//
// Kepler ellipse for finale_ring_dive, Saturn at one focus.

import * as THREE from "three";
import { TERMINAL_T_START } from "../../data/missionConstants";

const TABLEAU_T_START = 0.978;
const TABLEAU_T_END = TERMINAL_T_START;

// Tuned so the ring-plane crossings land at x = +/-305, inside the visible band.
const APOAPSE = 700;
const PERIAPSE = 195;
const SEMI_MAJOR = (APOAPSE + PERIAPSE) / 2;
const ECCENTRICITY = (APOAPSE - PERIAPSE) / (APOAPSE + PERIAPSE);

const INCLINATION_DEG = 85;
const INCLINATION_RAD = (INCLINATION_DEG * Math.PI) / 180;
const SIN_I = Math.sin(INCLINATION_RAD);
const COS_I = Math.cos(INCLINATION_RAD);

// Three half-revolutions, apoapse to periapse.
const M_START = Math.PI;
const M_END = 4 * Math.PI;

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 5; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    E -= f / fp;
  }
  return E;
}

function trueAnomalyFromE(E: number, e: number): number {
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    )
  );
}

function samplePosition(t: number, out: THREE.Vector3): void {
  const tc = Math.max(TABLEAU_T_START, Math.min(TABLEAU_T_END, t));
  const progress = (tc - TABLEAU_T_START) / (TABLEAU_T_END - TABLEAU_T_START);
  const M = M_START + (M_END - M_START) * progress;
  const E = solveKepler(M, ECCENTRICITY);
  const theta = trueAnomalyFromE(E, ECCENTRICITY);

  const r =
    (SEMI_MAJOR * (1 - ECCENTRICITY * ECCENTRICITY)) /
    (1 + ECCENTRICITY * Math.cos(theta));

  const u = r * Math.sin(theta);
  const v = -r * Math.cos(theta);

  // Line of nodes is +X, so it doubles as the inclination rotation axis.
  out.set(u, v * SIN_I, v * COS_I);
}

export interface RingDiveSample {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
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
export function getRingDiveSample(
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
  else sample.velocity.set(1, 0, 0);

  return sample;
}

export function getRingDiveCassiniPos(
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  samplePosition(t, out);
  return out;
}
