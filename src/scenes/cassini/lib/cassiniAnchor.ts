import * as THREE from "three";

// Live Cassini world position, drift and bob included, written once per
// frame by Spacecraft and read by the camera transition. Module scope keeps
// a per-frame value out of the store.
export const cassiniWorldPos = new THREE.Vector3();
