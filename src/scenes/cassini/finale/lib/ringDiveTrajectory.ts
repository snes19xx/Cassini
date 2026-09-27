import * as THREE from "three";
import {
  DIVE_T_END,
  SWING_T_END,
  finaleOrbitPosition,
  finaleOrbitSample,
  type RingDiveSample,
} from "./finaleOrbit";

export type { RingDiveSample };

const _defaultOut: RingDiveSample = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
};

/** Position and unit velocity at mission t. */
export function getRingDiveSample(
  t: number,
  out?: RingDiveSample,
): RingDiveSample {
  return finaleOrbitSample(t, SWING_T_END, DIVE_T_END, out ?? _defaultOut);
}

/** Position only, for the JUMP-TO snap. */
export function getRingDiveCassiniPos(
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  return finaleOrbitPosition(
    Math.max(SWING_T_END, Math.min(DIVE_T_END, t)),
    out,
  );
}
