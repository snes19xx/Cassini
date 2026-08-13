// src/scenes/cassini/finale/lib/approachTrajectory.ts
//
// Cassini's path across finale_approach, apoapse down to the polar pass entry.

import * as THREE from "three";

const TABLEAU_T_START = 0.945;
const TABLEAU_T_END = 0.955;

// Mirror cassiniOffset on finale_approach and finale_polar so JUMP-TO agrees.
const P0 = new THREE.Vector3(250, 450, 250);
const P2 = new THREE.Vector3(60, 420, 90);

export function getApproachCassiniPos(
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const raw = (t - TABLEAU_T_START) / (TABLEAU_T_END - TABLEAU_T_START);
  const p = Math.max(0, Math.min(1, raw));
  // The real orbit crawls at apoapse and accelerates into the dive.
  const eased = p * p;
  out.lerpVectors(P0, P2, eased);
  return out;
}
