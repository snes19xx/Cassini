// src/scenes/cassini/data/labelOffsets.ts
//
// Tuning file for label dot positions. Coordinates are model-local, before
// world rotation: +X starboard, +Y up toward the HGA dish, +Z forward
// toward the instrument bay.

import * as THREE from "three";

// Primary instruments (bus, hga, huygens, iss, radar) start at the mesh's
// bounding-box centroid, corrected by PRIMARY_NUDGES.
export const PRIMARY_NUDGES: Record<string, THREE.Vector3> = {
  bus: new THREE.Vector3(0.5, -1.4, 0),
  hga: new THREE.Vector3(2.4, -8.2, -0.5),
  huygens: new THREE.Vector3(0, 0, 0),
  iss: new THREE.Vector3(-1.3, -0.7, 0),
  radar: new THREE.Vector3(0.8, -0.7, 0.1),
};

// Each dot lands at exactly this offset, rotated by the spacecraft
// quaternion and added to the bus world position.
export const SECONDARY_OFFSETS: Record<string, THREE.Vector3> = {
  // Magnetometer boom. Floats off the visible geometry, clear of the
  // Huygens cone, so the leader line and label box stay clean.
  mag: new THREE.Vector3(1.8, 3.1, -3.0),

  // Instrument bay, starboard side, upper-middle of front face.
  vims: new THREE.Vector3(-1.39, 2.85, 0.5),

  // Instrument bay, port side, mirrors vims.
  cirs: new THREE.Vector3(-1.75, 1.45, 0),

  // Instrument bay, upper-centre, slightly starboard.
  inms: new THREE.Vector3(1, 2.6, 0.65),

  // Instrument bay, starboard side, lower than vims.
  uvis: new THREE.Vector3(-1.2, 1.8, 0.3),

  // Electric-field antennas near the top of the bus, just below the dish
  // ring so the label box can flow upward into clear space.
  rpws: new THREE.Vector3(6.75, 2, 0.45),

  // Upper-port face of the bus, just below the HGA mount ring.
  caps: new THREE.Vector3(0.8, 1.5, 0.2),

  // Starboard side of the bus, mid-height, slight rearward bias.
  mimi: new THREE.Vector3(-0.65, 2, -0.25),

  // Lower equipment module at the bottom of the bus.
  cda: new THREE.Vector3(4.5, 3, 0.05),

  // Uses the HGA as aperture; anchor sits near the feed / upper bus.
  rss: new THREE.Vector3(-0.7, 0.45, 0.0),

  // Low-Gain Antenna 1, mounted on top of the HGA dish feed.
  lga1: new THREE.Vector3(0, 6.9, 0.25),
};
