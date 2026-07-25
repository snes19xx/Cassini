// src/scenes/cassini/data/bodyLabels.ts
//
// Labels overlay data. Two label tiers per body:
//
//   1. Body label — the moon's name (TITAN / IAPETUS / …) shown at the
//      moon's centre when its tableau is active. Currently the only label
//      actually rendered in production.
//
//   2. Surface features — points of interest ON the moon's surface (e.g.,
//      Ontario Lacus on Titan, Cassini Regio on Iapetus, Herschel crater
//      on Mimas). NOT rendered today — every body's `surfaceFeatures`
//      array is empty. The structure is in place so a future contributor
//      can add entries here and the Projector will pick them up
//      automatically without further wiring.
//
// Surface-feature positions are specified as lat/lon in degrees because
// that's how planetary literature reports them. `latLonToUnitVec` converts
// to a unit vector on the body's local-frame sphere; the Projector
// multiplies by the body's effective rendered radius to get the actual
// world position for projection.

export interface SurfaceFeature {
  /** Unique within the body (lower-kebab-case is fine). */
  id: string;
  /** Display label, e.g. "ONTARIO LACUS". */
  name: string;
  /** Latitude in degrees: -90 (south pole) to +90 (north pole). */
  lat: number;
  /** Longitude in degrees: -180 to +180. Convention: 0° at +X. */
  lon: number;
}

export interface BodyLabel {
  /** Matches tableau.body and the textureService MoonId set. */
  bodyId: string;
  /** Display label at the body's centre. */
  name: string;
  /** Surface points of interest. Empty by default — fill in later. */
  surfaceFeatures: SurfaceFeature[];
}

// One entry per moon tableau body. To add a surface feature, append to
// the relevant body's `surfaceFeatures` array — no other code changes
// required. Example (commented out until needed):
//
//   {
//     bodyId: "titan",
//     name: "TITAN",
//     surfaceFeatures: [
//       { id: "ontario_lacus", name: "ONTARIO LACUS", lat: -72, lon: 183 },
//       { id: "kraken_mare",   name: "KRAKEN MARE",   lat:  68, lon: 310 },
//     ],
//   },
export const BODY_LABELS: BodyLabel[] = [
  { bodyId: "titan",     name: "TITAN",     surfaceFeatures: [] },
  { bodyId: "iapetus",   name: "IAPETUS",   surfaceFeatures: [] },
  { bodyId: "enceladus", name: "ENCELADUS", surfaceFeatures: [] },
  { bodyId: "mimas",     name: "MIMAS",     surfaceFeatures: [] },
  { bodyId: "tethys",    name: "TETHYS",    surfaceFeatures: [] },
  { bodyId: "rhea",      name: "RHEA",      surfaceFeatures: [] },
  { bodyId: "dione",     name: "DIONE",     surfaceFeatures: [] },
  // PIA14573 FAMILY PORTRAIT small moons (2026-07-07).
  { bodyId: "janus",     name: "JANUS",     surfaceFeatures: [] },
  { bodyId: "pandora",   name: "PANDORA",   surfaceFeatures: [] },
];

/** Find the BodyLabel for a given body id, or null if none. */
export function findBodyLabel(bodyId: string): BodyLabel | null {
  return BODY_LABELS.find((b) => b.bodyId === bodyId) ?? null;
}

/**
 * Convert lat/lon (degrees) to a unit vector on the body's local-frame
 * sphere. Convention:
 *   • Positive Y = north pole.
 *   • Longitude 0° points along +X; longitude rises going counter-clockwise
 *     when viewed from above the north pole (toward +Z at 90°).
 *
 * Callers multiply the returned vector by the body's effective rendered
 * radius to get the world-space position of the surface feature.
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
