// src/scenes/cassini/finale/lib/swingAroundTrajectory.ts
//
// Kepler ellipse for finale_swing_around, same orbital frame as the ring dive.

import * as THREE from "three";
import { TERMINAL_T_START } from "../../data/missionConstants";
import type { RingDiveSample } from "./ringDiveTrajectory";

const TABLEAU_T_START = 0.963;
const TABLEAU_T_END = 0.978;

// Tuned so the ring-plane crossings land at x = +/-460, just outside the F ring.
const APOAPSE = 700;
const PERIAPSE = 342;
const SEMI_MAJOR = (APOAPSE + PERIAPSE) / 2;
const ECCENTRICITY = (APOAPSE - PERIAPSE) / (APOAPSE + PERIAPSE);

const INCLINATION_DEG = 85;
const INCLINATION_RAD = (INCLINATION_DEG * Math.PI) / 180;
const SIN_I = Math.sin(INCLINATION_RAD);
const COS_I = Math.cos(INCLINATION_RAD);

// Start on the +X crossing, climbing toward apoapse.
const THETA_START = Math.PI / 2;
// Inverse Kepler, so the cadence starts at the crossing and not at periapse.
const E_AT_THETA_START =
  2 *
  Math.atan(
    Math.sqrt((1 - ECCENTRICITY) / (1 + ECCENTRICITY)) *
      Math.tan(THETA_START / 2),
  );
const M_START = E_AT_THETA_START - ECCENTRICITY * Math.sin(E_AT_THETA_START);
// Ends at apoapse, where the ring dive picks up.
const M_END = 3 * Math.PI;

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
  const rawProgress = (tc - TABLEAU_T_START) / (TABLEAU_T_END - TABLEAU_T_START);

  // Both of these restate ringDiveTrajectory's window and shape, so they have
  // to move with it or the two orbits stop meeting at the same speed.
  const deltaTDive = TERMINAL_T_START - 0.978;
  const e2 = (700 - 195) / (700 + 195);

  const deltaTSwing = TABLEAU_T_END - TABLEAU_T_START;
  const dM_dive_dt = (3 * Math.PI) / deltaTDive;
  const e1 = ECCENTRICITY;
  // At apoapse the speed goes as dM/dt * sqrt((1-e) / (1+e)^3).
  const vFactor = Math.sqrt(
    ((1 - e2) / (1 - e1)) * Math.pow((1 + e1) / (1 + e2), 3),
  );
  const target_dM_swing_dt = dM_dive_dt * vFactor;

  const deltaM = M_END - M_START;
  const targetFPrime1 = (target_dM_swing_dt * deltaTSwing) / deltaM;
  // f(x) = Ax^2 + Bx with f(1) = 1, so B = 1 - A and f'(1) = A + 1.
  const A = targetFPrime1 - 1;
  const B = 1 - A;
  const progress = A * rawProgress * rawProgress + B * rawProgress;

  const M = M_START + (M_END - M_START) * progress;
  const E = solveKepler(M, ECCENTRICITY);
  const theta = trueAnomalyFromE(E, ECCENTRICITY);
  const r =
    (SEMI_MAJOR * (1 - ECCENTRICITY * ECCENTRICITY)) /
    (1 + ECCENTRICITY * Math.cos(theta));

  const u = r * Math.sin(theta);
  const v = -r * Math.cos(theta);

  out.set(u, v * SIN_I, v * COS_I);
}

const _scratchA = new THREE.Vector3();
const _scratchB = new THREE.Vector3();
const _defaultOut: RingDiveSample = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
};
const VEL_EPSILON = 0.0001;

export function getSwingAroundSample(
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

export function getSwingAroundCassiniPos(
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  samplePosition(t, out);
  return out;
}
