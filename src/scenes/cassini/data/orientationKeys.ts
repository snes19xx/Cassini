// Euler angles in radians, order 'YXZ'
// Anchored to normalized mission t values derived from JPL Horizons ephemeris timestamps.

export interface OrientationKey {
  t: number;
  euler: [number, number, number]; // [x, y, z] in radians, order 'YXZ'
}

export const ORIENTATION_KEYS: OrientationKey[] = [
  // t=0.00: Pre-SOI approach. HGA aimed at Earth (pitch down slightly).
  { t: 0.0, euler: [0.0, 0.0, 0.0] },
  // t=0.336841: SOI burn attitude (calculated T for July 1, 2004).
  // Engine pointing retrograde to Saturn.
  { t: 0.336841, euler: [0.0, Math.PI, 0.0] },
  // t=0.35: Post-SOI. HGA back to Earth downlink attitude.
  { t: 0.35, euler: [0.05, 0.0, 0.0] },
  // t=0.361177: Pre-separation attitude (calculated T for Dec 25, 2004).
  // Huygens aligned to Titan approach vector.
  { t: 0.361177, euler: [-0.12, 0.3, 0.1] },
  // t=0.42: Post-separation. Cassini reorients for relay-link antenna pointing.
  { t: 0.42, euler: [0.08, 0.15, 0.0] },
  // t=0.65: Grand Finale approach begins. Ring-plane crossing, flat attitude.
  { t: 0.65, euler: [0.0, 0.0, 0.0] },
  // t=0.980471: Atmospheric entry (calculated T for Apr 26, 2017 start of Finale).
  // Cassini pitches over, engine retrograde.
  { t: 0.980471, euler: [Math.PI / 2, 0.4, 0.2] },
  // t=1.00: Terminal. Orientation held at entry through the tumble.
  { t: 1.0, euler: [Math.PI / 2, 0.4, 0.2] },
];
