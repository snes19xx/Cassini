// src/scenes/cassini/arrival/lib/arrivalShot.ts
//
// Saturn orbit insertion approach, as pure functions of mission t.

export const ARRIVAL_TABLEAU_ID = "saturn_arrival";

export function isArrivalTableau(id: string): boolean {
  return id === ARRIVAL_TABLEAU_ID;
}

export const ARRIVAL_T_START = 0.18;
export const ARRIVAL_T_END = 0.353;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Mission t to progress through the arrival window, clamped to [0, 1]. */
export function arrivalProgress(t: number): number {
  return clamp01((t - ARRIVAL_T_START) / (ARRIVAL_T_END - ARRIVAL_T_START));
}

export const ARRIVAL_RADIUS_START = 12000;
// 780 puts Saturn's equatorial diameter at about 0.56 of frame height.
export const ARRIVAL_RADIUS_END = 780;

// Ratio of actual to scripted camera distance past which the driver snaps.
export const ARRIVAL_SNAP_RATIO = 1.6;

/** Arrival progress where the approach ends and the departure begins. */
export const ARRIVAL_REVEAL_P = 0.944789;

/** Arrival progress remapped so the whole approach plays out before the beat. */
export function arrivalApproachQ(p: number): number {
  return clamp01(p / ARRIVAL_REVEAL_P);
}

// Blends the pure exponential and reciprocal radius curves to damp both extremes.
const RADIUS_CURVE_BLEND = 0.35;

/** Camera distance to Saturn's centre at progress p. */
export function arrivalRadius(p: number): number {
  const f = arrivalApproachQ(p);
  // Geometric interpolation: apparent size grows at a constant relative rate.
  const exp = ARRIVAL_RADIUS_START * Math.pow(ARRIVAL_RADIUS_END / ARRIVAL_RADIUS_START, f);
  const har = 1 / ((1 - f) / ARRIVAL_RADIUS_START + f / ARRIVAL_RADIUS_END);
  return exp * (1 - RADIUS_CURVE_BLEND) + har * RADIUS_CURVE_BLEND;
}

export const ARRIVAL_POLAR_START_DEG = 85;
export const ARRIVAL_POLAR_END_DEG = 58;

export const ARRIVAL_ROLL_START_DEG = 0;
export const ARRIVAL_ROLL_END_DEG = 26.73;

const DEG = Math.PI / 180;

/** Camera polar angle from +Y, in radians, at progress p. */
export function arrivalPolarRad(p: number): number {
  const f = arrivalApproachQ(p);
  return (
    (ARRIVAL_POLAR_START_DEG + (ARRIVAL_POLAR_END_DEG - ARRIVAL_POLAR_START_DEG) * f) * DEG
  );
}

/** Saturn group roll about world Z, in degrees, at progress p. */
export function arrivalRollDeg(p: number): number {
  const f = arrivalApproachQ(p);
  return ARRIVAL_ROLL_START_DEG + (ARRIVAL_ROLL_END_DEG - ARRIVAL_ROLL_START_DEG) * f;
}

/** Saturn group roll about world Z, in radians, at progress p. */
export function arrivalRollRad(p: number): number {
  return arrivalRollDeg(p) * DEG;
}

export const ARRIVAL_START_CAMERA_POS: [number, number, number] = [
  0,
  ARRIVAL_RADIUS_START * Math.cos(ARRIVAL_POLAR_START_DEG * DEG),
  ARRIVAL_RADIUS_START * Math.sin(ARRIVAL_POLAR_START_DEG * DEG),
];

export const ARRIVAL_ZOOM_MIN = 0.75;
export const ARRIVAL_ZOOM_MAX = 1.25;

// Ignore tiny radius drift from OrbitControls
const ZOOM_DEAD_ZONE = 1e-4;

/** Updates the zoom from this frame's scroll. */
export function accumulateArrivalZoom(
  zoom: number,
  written: number,
  observed: number,
): number {
  if (!(written > 0) || !Number.isFinite(observed)) return zoom;
  const ratio = observed / written;
  if (!Number.isFinite(ratio) || Math.abs(ratio - 1) <= ZOOM_DEAD_ZONE) {
    return zoom;
  }
  const next = zoom * ratio;
  if (!Number.isFinite(next)) return zoom;
  return next < ARRIVAL_ZOOM_MIN
    ? ARRIVAL_ZOOM_MIN
    : next > ARRIVAL_ZOOM_MAX
      ? ARRIVAL_ZOOM_MAX
      : next;
}

// Cassini rounds periapsis and climbs on a capture orbit while the lens
// slews off Saturn before the cut into titan_huygens. That tableau moves
// Saturn to a backdrop and gives Titan the origin.

type Vec3 = [number, number, number];

/** Eccentricity of the capture orbit. */
export const DEPART_ECCENTRICITY = 0.75;
// 100 degrees carries the craft roughly a quarter of the way around Saturn.
export const DEPART_TRUE_ANOMALY_END_DEG = 100;
// 55 degrees clears the ring ansa (about 30 deg) inside the frame's 36.4 deg
// half-width by 4.4s of the 5s beat.
export const DEPART_SLEW_END_DEG = 55;
/** Departure heading tilt above the local horizontal, degrees. */
export const DEPART_CLIMB_DEG = 12;
/** Which way round the planet. Flip to mirror the whole beat. */
export const DEPART_SWEEP_SIGN = -1;

function v3add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function v3sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function v3scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function v3dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function v3cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function v3norm(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? v3scale(a, 1 / l) : [0, 0, 1];
}

function smoothstep01(x: number): number {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
}

function trueToMeanAnomaly(nu: number, e: number): number {
  const E = 2 * Math.atan2(
    Math.sqrt(1 - e) * Math.sin(nu / 2),
    Math.sqrt(1 + e) * Math.cos(nu / 2),
  );
  return E - e * Math.sin(E);
}

// Mean to true anomaly via Newton on Kepler's equation. Local because
// lib/orbitalMechanics.ts's solver is private and works in the XY plane.
function meanToTrueAnomaly(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 24; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-10) break;
  }
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  );
}

const DEPART_MEAN_ANOMALY_END = trueToMeanAnomaly(
  DEPART_TRUE_ANOMALY_END_DEG * DEG,
  DEPART_ECCENTRICITY,
);

/** Arrival progress to departure progress [0, 1]. 0 means the approach is still on. */
export function arrivalSwingProgress(p: number): number {
  if (p <= ARRIVAL_REVEAL_P) return 0;
  return clamp01((p - ARRIVAL_REVEAL_P) / (1 - ARRIVAL_REVEAL_P));
}

/** True anomaly at departure progress u, radians. Fastest at periapsis, slowing while it climbs. */
export function arrivalDepartTrueAnomaly(u: number): number {
  return meanToTrueAnomaly(
    DEPART_MEAN_ANOMALY_END * clamp01(u),
    DEPART_ECCENTRICITY,
  );
}

/** Camera distance from Saturn during the departure, in scene units. */
export function arrivalDepartRadius(u: number): number {
  const nu = arrivalDepartTrueAnomaly(u);
  const semiLatus = ARRIVAL_RADIUS_END * (1 + DEPART_ECCENTRICITY);
  return semiLatus / (1 + DEPART_ECCENTRICITY * Math.cos(nu));
}

/** Aim angle off nadir at departure progress u, degrees. */
export function arrivalDepartSlewDeg(u: number): number {
  return DEPART_SLEW_END_DEG * smoothstep01(clamp01(u));
}

/** Perifocal basis for the departure: radial is the handover (periapsis) direction, prograde the velocity there. Both unit and orthogonal. */
export function arrivalDepartureBasis(azimuthRad: number): {
  radial: Vec3;
  prograde: Vec3;
} {
  const polar = ARRIVAL_POLAR_END_DEG * DEG;
  const sp = Math.sin(polar);
  const radial: Vec3 = [
    sp * Math.sin(azimuthRad),
    Math.cos(polar),
    sp * Math.cos(azimuthRad),
  ];
  const up: Vec3 = [0, 1, 0];
  const east = v3norm(v3cross(up, radial));
  const climb = DEPART_CLIMB_DEG * DEG;
  const heading = v3add(
    v3scale(east, DEPART_SWEEP_SIGN * Math.cos(climb)),
    v3scale(up, Math.sin(climb)),
  );
  const prograde = v3norm(
    v3sub(heading, v3scale(radial, v3dot(heading, radial))),
  );
  return { radial, prograde };
}

export interface DepartureState {
  pos: Vec3;
  /** Unit look direction, aimed away from Saturn. */
  aim: Vec3;
  radius: number;
}

/** Camera pose during the departure: position follows the conic, aim rotates from nadir toward the velocity vector in the orbital plane. */
export function arrivalDepartureState(
  u: number,
  azimuthRad: number,
): DepartureState {
  const { radial, prograde } = arrivalDepartureBasis(azimuthRad);
  const nu = arrivalDepartTrueAnomaly(u);
  const radius = arrivalDepartRadius(u);
  const pos = v3add(
    v3scale(radial, radius * Math.cos(nu)),
    v3scale(prograde, radius * Math.sin(nu)),
  );
  const outward = v3norm(pos);
  const tangent = v3norm(
    v3sub(prograde, v3scale(outward, v3dot(prograde, outward))),
  );
  const theta = arrivalDepartSlewDeg(u) * DEG;
  const aim = v3norm(
    v3add(v3scale(outward, -Math.cos(theta)), v3scale(tangent, Math.sin(theta))),
  );
  return { pos, aim, radius };
}

// Titan entry: the cut swaps the whole frame at once.

export const TITAN_TABLEAU_ID = "titan_huygens";

/** The titan_huygens camera preset; tableaus.ts reads it directly. */
export const TITAN_CAMERA_POS: Vec3 = [110, 40, 220];

/** End of the entry beat in mission t. Lands ~2.4s after the cut at 1x. */
export const TITAN_ENTRY_T_END = 0.357;

/** Keeps the beat mounted a little past TITAN_ENTRY_T_END for high-speed playback. */
export const TITAN_ENTRY_MOUNT_T_END = TITAN_ENTRY_T_END + 0.002;

/** Camera distance from Titan when the beat opens. */
export const TITAN_ENTRY_START_DIST = 620;
// How far round Titan the camera travels; bounded to avoid a whip.
export const TITAN_ENTRY_ARC_DEG = 34;
/** Aim offset off Titan when the beat opens, decaying to 0. Saturn exits frame left during the departure; Titan enters from the right. */
export const TITAN_ENTRY_OFFSET_DEG = 42;

/** Mission t -> progress through the Titan entry beat, clamped to [0, 1]. */
export function titanEntryProgress(t: number): number {
  return clamp01((t - ARRIVAL_T_END) / (TITAN_ENTRY_T_END - ARRIVAL_T_END));
}

function rotateAboutY(v: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

function slerpUnit(a: Vec3, b: Vec3, t: number): Vec3 {
  const d = Math.max(-1, Math.min(1, v3dot(a, b)));
  const omega = Math.acos(d);
  if (omega < 1e-6) return a;
  const s = Math.sin(omega);
  return v3norm(
    v3add(
      v3scale(a, Math.sin((1 - t) * omega) / s),
      v3scale(b, Math.sin(t * omega) / s),
    ),
  );
}

/** Camera pose during the Titan entry: aim is Titan's live direction rotated by a decaying offset. */
export function titanEntryState(v: number): { pos: Vec3; aim: Vec3 } {
  const e = smoothstep01(clamp01(v));
  const endDist = Math.hypot(
    TITAN_CAMERA_POS[0],
    TITAN_CAMERA_POS[1],
    TITAN_CAMERA_POS[2],
  );
  const endDir = v3scale(TITAN_CAMERA_POS, 1 / endDist);
  const startDir = rotateAboutY(endDir, TITAN_ENTRY_ARC_DEG * DEG);
  const dir = slerpUnit(startDir, endDir, e);
  const radius =
    TITAN_ENTRY_START_DIST + (endDist - TITAN_ENTRY_START_DIST) * e;
  const pos = v3scale(dir, radius);
  const toTitan = v3scale(v3norm(pos), -1);
  const aim = rotateAboutY(toTitan, TITAN_ENTRY_OFFSET_DEG * (1 - e) * DEG);
  return { pos, aim };
}
