import * as THREE from "three";
import { TERMINAL_T_START } from "../../data/missionConstants";
import { missionToDisplay } from "../../lib/tRemap";

export const SWING_T_START = 0.945;
export const SWING_T_END = 0.978;
export const DIVE_T_END = TERMINAL_T_START;

export const APOAPSE = 1400;
export const SWING_PERIAPSE = 445;
export const B_RING_PERIAPSE = 300;
// Real gap passes: 1,600 to 3,900 km, 5 to 12 units.
export const GAP_PERIAPSE = 190;
export const CLOUD_TOPS = 180;
// Spacecraft scale in SWING AROUND and RING DIVE: about 6.5 units.
export const ORBITAL_MODEL_SCALE = 0.25;
export const WIDE_MODEL_SCALE = 1.5;
// Real entry: 9.4 N, 53 W, near local noon (NASA, 2017-09-15).
export const ENTRY_LAT = THREE.MathUtils.degToRad(9.4);

export const INCLINATION = THREE.MathUtils.degToRad(62);
export const PERIAPSE_LAT = THREE.MathUtils.degToRad(-6);

// Swing opens at the northern pass, 62 N, over the pole.
const SWING_START_U = THREE.MathUtils.degToRad(90);
// dt/dE = c * (1 - e cos E)^alpha. 1 is Kepler, 0 is uniform in E.
const PACING_ALPHA = 0.35;

// SceneLighting key light; periapse points at it.
const SUN_X = -400;
const SUN_Z = 200;

const Y = new THREE.Vector3(0, 1, 0);
// Ascending node points anti-sun, putting periapse (u ~ 187 deg) at noon.
const NODE = new THREE.Vector3(-SUN_X, 0, -SUN_Z).normalize();
// Y x NODE is prograde: X -> -Z seen from +Y, the ring spin direction.
const PROGRADE = new THREE.Vector3().crossVectors(Y, NODE);
const TILTED = PROGRADE.clone()
  .multiplyScalar(Math.cos(INCLINATION))
  .addScaledVector(Y, Math.sin(INCLINATION));
// Argument of periapse: sin(lat) = sin(i) sin(u).
const OMEGA =
  Math.PI + Math.asin(Math.sin(-PERIAPSE_LAT) / Math.sin(INCLINATION));

const TABLE_SIZE = 1024;

interface Leg {
  a: number;
  e: number;
  /** Clock (display t) at the leg's start and end. */
  s0: number;
  s1: number;
  /** Eccentric anomaly samples and the clock at each. */
  E: Float64Array;
  s: Float64Array;
}

function trueAnomaly(E: number, e: number): number {
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    )
  );
}

function eccentricAnomaly(theta: number, e: number): number {
  return 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(theta / 2));
}

function weight(E: number, e: number): number {
  return Math.pow(1 - e * Math.cos(E), PACING_ALPHA);
}

/** Speed at apoapse per unit of rate c (speed = apoapseSpeedGain / c). */
function apoapseSpeedGain(a: number, e: number): number {
  return (a * Math.sqrt(1 - e * e)) / Math.pow(1 + e, PACING_ALPHA);
}

function elements(periapse: number): { a: number; e: number } {
  return {
    a: (APOAPSE + periapse) / 2,
    e: (APOAPSE - periapse) / (APOAPSE + periapse),
  };
}

function buildLeg(
  periapse: number,
  E0: number,
  E1: number,
  s0: number,
  cStart: number,
  cEnd: number,
): Leg {
  const { a, e } = elements(periapse);
  const E = new Float64Array(TABLE_SIZE);
  const s = new Float64Array(TABLE_SIZE);
  let prev = 0;
  for (let i = 0; i < TABLE_SIZE; i++) {
    const f = i / (TABLE_SIZE - 1);
    E[i] = E0 + (E1 - E0) * f;
    const rate = (cStart + (cEnd - cStart) * f) * weight(E[i]!, e);
    s[i] = i === 0 ? s0 : s[i - 1]! + 0.5 * (prev + rate) * (E[i]! - E[i - 1]!);
    prev = rate;
  }
  return { a, e, s0, s1: s[TABLE_SIZE - 1]!, E, s };
}

/** Integral of weight over [E0, E1], and of f * weight where f runs 0 to 1. */
function weightIntegrals(e: number, E0: number, E1: number): [number, number] {
  let total = 0;
  let ramped = 0;
  const n = TABLE_SIZE * 4;
  const h = (E1 - E0) / n;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const w = weight(E0 + f * (E1 - E0), e) * h;
    total += w;
    ramped += f * w;
  }
  return [total, ramped];
}

/** Periapse of the orbit that meets the cloud tops at ENTRY_LAT inbound. */
function entryLeg(): { periapse: number; E0: number; E1: number } {
  const uEntry =
    Math.PI - Math.asin(Math.sin(ENTRY_LAT) / Math.sin(INCLINATION));
  const c = Math.cos(uEntry - OMEGA);
  const periapse =
    (CLOUD_TOPS * APOAPSE * (1 + c)) / (2 * APOAPSE - CLOUD_TOPS * (1 - c));
  const { e } = elements(periapse);
  return {
    periapse,
    E0: Math.PI,
    E1: 2 * Math.PI + eccentricAnomaly(uEntry - OMEGA, e),
  };
}

export const DIVE_LEGS = [
  { periapse: B_RING_PERIAPSE, E0: Math.PI, E1: 3 * Math.PI },
  { periapse: GAP_PERIAPSE, E0: Math.PI, E1: 3 * Math.PI },
  entryLeg(),
] as const;

function buildLegs(): Leg[] {
  const sSwing0 = missionToDisplay(SWING_T_START);
  const sSwing1 = missionToDisplay(SWING_T_END);
  const sDive1 = missionToDisplay(DIVE_T_END);

  // The apoapse speed that makes the dive legs fill the dive window.
  let sum = 0;
  for (const { periapse, E0, E1 } of DIVE_LEGS) {
    const { a, e } = elements(periapse);
    sum += apoapseSpeedGain(a, e) * weightIntegrals(e, E0, E1)[0];
  }
  const vApoapse = sum / (sDive1 - sSwing1);

  // Swing ramps its rate to reach vApoapse as its own window ends.
  const sw = elements(SWING_PERIAPSE);
  const E0 = eccentricAnomaly(SWING_START_U - OMEGA, sw.e);
  const cEnd = apoapseSpeedGain(sw.a, sw.e) / vApoapse;
  const [total, ramped] = weightIntegrals(sw.e, E0, Math.PI);
  const cStart = (sSwing1 - sSwing0 - cEnd * ramped) / (total - ramped);

  const legs = [buildLeg(SWING_PERIAPSE, E0, Math.PI, sSwing0, cStart, cEnd)];
  let s0 = sSwing1;
  for (const { periapse, E0: lo, E1: hi } of DIVE_LEGS) {
    const { a, e } = elements(periapse);
    const c = apoapseSpeedGain(a, e) / vApoapse;
    const leg = buildLeg(periapse, lo, hi, s0, c, c);
    legs.push(leg);
    s0 = leg.s1;
  }
  return legs;
}

const LEGS = buildLegs();

function positionAt(leg: Leg, E: number, out: THREE.Vector3): THREE.Vector3 {
  const u = trueAnomaly(E, leg.e) + OMEGA;
  const r = leg.a * (1 - leg.e * Math.cos(E));
  return out
    .copy(NODE)
    .multiplyScalar(r * Math.cos(u))
    .addScaledVector(TILTED, r * Math.sin(u));
}

function eccentricAnomalyAtClock(leg: Leg, s: number): number {
  const { E, s: clock } = leg;
  let lo = 0;
  let hi = TABLE_SIZE - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (clock[mid]! <= s) lo = mid;
    else hi = mid;
  }
  const span = clock[hi]! - clock[lo]!;
  const f = span > 0 ? (s - clock[lo]!) / span : 0;
  return E[lo]! + (E[hi]! - E[lo]!) * f;
}

/** Cassini's position on the finale orbit at t, clamped to the two tableaus. */
export function finaleOrbitPosition(
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const tc = Math.max(SWING_T_START, Math.min(DIVE_T_END, t));
  const s = missionToDisplay(tc);
  let leg = LEGS[LEGS.length - 1]!;
  for (const l of LEGS) {
    if (s <= l.s1) {
      leg = l;
      break;
    }
  }
  const sc = Math.max(leg.s0, Math.min(leg.s1, s));
  return positionAt(leg, eccentricAnomalyAtClock(leg, sc), out);
}

export interface RingDiveSample {
  position: THREE.Vector3;
  velocity: THREE.Vector3; // unit tangent
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const VEL_EPSILON = 0.0001;

/**
 * Position plus unit velocity at t, both clamped to [tMin, tMax].
 * Velocity is a finite difference, one-sided at the window ends.
 */
export function finaleOrbitSample(
  t: number,
  tMin: number,
  tMax: number,
  out: RingDiveSample,
): RingDiveSample {
  const tc = Math.max(tMin, Math.min(tMax, t));
  finaleOrbitPosition(tc, out.position);
  finaleOrbitPosition(Math.max(tMin, tc - VEL_EPSILON), _a);
  finaleOrbitPosition(Math.min(tMax, tc + VEL_EPSILON), _b);
  out.velocity.subVectors(_b, _a);
  const len = out.velocity.length();
  if (len > 1e-8) out.velocity.multiplyScalar(1 / len);
  else out.velocity.set(1, 0, 0);
  return out;
}
