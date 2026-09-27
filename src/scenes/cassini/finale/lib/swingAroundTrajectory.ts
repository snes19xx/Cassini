import * as THREE from "three";
import {
  SWING_T_END,
  SWING_T_START,
  finaleOrbitPosition,
  finaleOrbitSample,
  type RingDiveSample,
} from "./finaleOrbit";

const _defaultOut: RingDiveSample = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
};

/** Position and unit velocity at mission t. */
export function getSwingAroundSample(
  t: number,
  out?: RingDiveSample,
): RingDiveSample {
  return finaleOrbitSample(t, SWING_T_START, SWING_T_END, out ?? _defaultOut);
}

/** Position only, for the JUMP-TO snap. */
export function getSwingAroundCassiniPos(
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  return finaleOrbitPosition(
    Math.max(SWING_T_START, Math.min(SWING_T_END, t)),
    out,
  );
}
