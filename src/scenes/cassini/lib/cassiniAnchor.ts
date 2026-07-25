import * as THREE from "three";

// Live Cassini world position, drift and bob included, written once per
// frame by Spacecraft and read by the camera transition. Module scope
// rather than the store since it changes every frame and nothing renders
// off it directly.
export const cassiniWorldPos = new THREE.Vector3();
