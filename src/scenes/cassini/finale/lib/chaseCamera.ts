import * as THREE from "three";
import { SWING_T_END, SWING_T_START } from "./finaleOrbit";

// Model is ~6.5 units at ORBITAL_MODEL_SCALE.
export const CHASE_DIST = 40;
const HORIZON_LIFT = THREE.MathUtils.degToRad(10);
const MAX_PITCH = THREE.MathUtils.degToRad(88);
const SATURN_R = 180;

// SWING AROUND opens north-up over the pole, then banks level.
const SWING_SPAN = SWING_T_END - SWING_T_START;
const NORTH_UP_HOLD_END = SWING_T_START + SWING_SPAN * 0.15;
const NORTH_UP_BLEND_END = SWING_T_START + SWING_SPAN * 0.3;

const Y = new THREE.Vector3(0, 1, 0);
const _outward = new THREE.Vector3();
const _level = new THREE.Vector3();
const _view = new THREE.Vector3();
const _north = new THREE.Vector3();
const _cross = new THREE.Vector3();

function northUpWeight(t: number): number {
  if (t <= NORTH_UP_HOLD_END) return 1;
  if (t >= NORTH_UP_BLEND_END) return 0;
  const x = (t - NORTH_UP_HOLD_END) / (NORTH_UP_BLEND_END - NORTH_UP_HOLD_END);
  return 1 - x * x * (3 - 2 * x);
}

/**
 * Chase pose behind and above `pos` along `heading`, looking at `pos`.
 * `level` holds the last usable horizontal heading between calls, for the
 * near-radial legs that have none, and is updated in place.
 */
export function chaseCameraPose(
  pos: THREE.Vector3,
  heading: THREE.Vector3,
  t: number,
  level: THREE.Vector3,
  outPos: THREE.Vector3,
  outUp: THREE.Vector3,
): void {
  const r = pos.length();
  if (r < 1e-3) _outward.set(1, 0, 0);
  else _outward.copy(pos).multiplyScalar(1 / r);

  _level.copy(heading).addScaledVector(_outward, -heading.dot(_outward));
  if (_level.lengthSq() > 1e-4) {
    level.copy(_level.normalize());
  } else {
    _level
      .copy(level)
      .addScaledVector(_outward, -level.dot(_outward))
      .normalize();
  }

  // Horizon dip seen from about the camera's altitude.
  const pitch0 = Math.min(
    Math.acos(Math.min(1, SATURN_R / r)) + HORIZON_LIFT,
    MAX_PITCH,
  );
  const rCam = r + CHASE_DIST * Math.sin(pitch0);
  const pitch = Math.min(
    Math.acos(Math.min(1, SATURN_R / rCam)) + HORIZON_LIFT,
    MAX_PITCH,
  );
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  outPos
    .copy(pos)
    .addScaledVector(_level, -CHASE_DIST * cosP)
    .addScaledVector(_outward, CHASE_DIST * sinP);
  outUp
    .copy(_level)
    .multiplyScalar(sinP)
    .addScaledVector(_outward, cosP)
    .normalize();

  const w = northUpWeight(t);
  if (w <= 0) return;
  _view.copy(pos).sub(outPos).normalize();
  _north.copy(Y).addScaledVector(_view, -Y.dot(_view));
  if (_north.lengthSq() < 1e-6) return;
  _north.normalize();
  _cross.crossVectors(outUp, _north);
  const angle = Math.atan2(_view.dot(_cross), outUp.dot(_north));
  outUp.applyAxisAngle(_view, angle * w);
}
