// src/scenes/cassini/data/bodyLabels.ts
//
// Labels overlay data. Two label tiers per body: the body's name shown at
// its centre (the only tier actually rendered today), and per-body surface
// features (lat/lon points of interest) whose arrays are all empty for now.

export interface SurfaceFeature {
  /** Unique within the body (lower-kebab-case is fine). */
  id: string;
  /** Display label, e.g. "ONTARIO LACUS". */
  name: string;
  /** Latitude in degrees: -90 (south pole) to +90 (north pole). */
  lat: number;
  /** Longitude in degrees: -180 to +180. Convention: 0 deg at +X. */
  lon: number;
}

export interface BodyLabel {
  /** Matches tableau.body and the textureService MoonId set. */
  bodyId: string;
  /** Display label at the body's centre. */
  name: string;
  /** Surface points of interest, empty by default. */
  surfaceFeatures: SurfaceFeature[];
}

// One entry per moon tableau body; add a surface feature by appending to
// the relevant body's `surfaceFeatures` array.
export const BODY_LABELS: BodyLabel[] = [
  { bodyId: "titan",     name: "TITAN",     surfaceFeatures: [] },
  { bodyId: "iapetus",   name: "IAPETUS",   surfaceFeatures: [] },
  { bodyId: "enceladus", name: "ENCELADUS", surfaceFeatures: [] },
  { bodyId: "mimas",     name: "MIMAS",     surfaceFeatures: [] },
  { bodyId: "tethys",    name: "TETHYS",    surfaceFeatures: [] },
  { bodyId: "rhea",      name: "RHEA",      surfaceFeatures: [] },
  { bodyId: "dione",     name: "DIONE",     surfaceFeatures: [] },
  // PIA14573 FAMILY PORTRAIT small moons.
  { bodyId: "janus",     name: "JANUS",     surfaceFeatures: [] },
  { bodyId: "pandora",   name: "PANDORA",   surfaceFeatures: [] },
];

/** Find the BodyLabel for a given body id, or null if none. */
export function findBodyLabel(bodyId: string): BodyLabel | null {
  return BODY_LABELS.find((b) => b.bodyId === bodyId) ?? null;
}

/**
 * Lat/lon (degrees) to a unit vector on the body's local-frame sphere.
 * Positive Y is the north pole; longitude 0 points along +X and rises
 * counter-clockwise viewed from above the pole.
 */
export function latLonToUnitVec(
  lat: number,
  lon: number,
): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return [cosLat * Math.cos(lonRad), Math.sin(latRad), cosLat * Math.sin(lonRad)];
}
