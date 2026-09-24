// Camera script for moon -> moon boundaries. Every single-moon tableau parks
// its moon at the world origin, so both moons of a boundary sit on one point.

import * as THREE from "three";
import { FULL_MISSION_SECONDS } from "../data/missionConstants";
import { DEFAULT_TABLEAU_FOV, TABLEAUS, type Tableau } from "../data/tableaus";
import { missionToDisplay } from "./tRemap";

/** Start distance from the incoming moon, as a multiple of its preset orbit. */
export const TRAVERSE_TRAVEL_FACTOR = 9;

/** Floor for that multiple once playback speed has shortened the fly. */
export const TRAVERSE_TRAVEL_FACTOR_MIN = 3;

// Swings the corridor off the view axis, clear of the departing moon.
export const TRAVERSE_SWING_RAD = (28 * Math.PI) / 180;
const TRAVERSE_LIFT = 0.25;
const TRAVERSE_BOW = 0.18;
const FADE_START_E = 0.7;
const FADE_END_E = 0.95;
const TURN_END_E = 0.5;

export const TRAVERSE_BASE_MS = 2200;

export interface TraverseShot {
  fromId: string;
  toId: string;
  /** Focal moon of the outgoing tableau, translated to `originA`. */
  fromBody: string;
  /** Focal moon of the incoming tableau, which stays at its own origin. */
  toBody: string;
  /** World translation applied to every part of the outgoing tableau. */
  originA: THREE.Vector3;
  curve: THREE.CatmullRomCurve3;
  /** Cassini's view-basis seat at each end, as (right, up, forward). */
  seatA: THREE.Vector3;
  seatB: THREE.Vector3;
  /** Camera look-at at e=0: the outgoing moon in its translated seat. */
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  /** Unit view directions at e=0 and e=1. */
  startView: THREE.Vector3;
  endView: THREE.Vector3;
  startDist: number;
  endDist: number;
  startFov: number;
  endFov: number;
  /** Outgoing Saturn backdrop, already translated. Null if either lacks one. */
  saturnFromPos: THREE.Vector3 | null;
  saturnToPos: THREE.Vector3 | null;
  saturnFromScale: number;
  saturnToScale: number;
  durationMs: number;
}

const BY_ID = new Map(TABLEAUS.map((t) => [t.id, t]));

/** True when the tableau parks a single focal moon at the origin. */
function isSingleMoonTableau(tab: Tableau | undefined): tab is Tableau {
  return (
    tab !== undefined &&
    tab.kind === "moon" &&
    tab.body !== undefined &&
    tab.moonEffectiveRadius !== undefined &&
    tab.moons === undefined
  );
}

/** True when both sides of the boundary are single-moon tableaus. */
export function isTraverseBoundary(prevId: string, nextId: string): boolean {
  if (prevId === nextId) return false;
  return (
    isSingleMoonTableau(BY_ID.get(prevId)) &&
    isSingleMoonTableau(BY_ID.get(nextId))
  );
}

/** Wall-clock seconds the tableau plays for at 1x. */
function tableauSeconds(tab: Tableau): number {
  return (
    (missionToDisplay(tab.tEnd) - missionToDisplay(tab.tStart)) *
    FULL_MISSION_SECONDS
  );
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const _view = new THREE.Vector3();
const _qTurn = new THREE.Quaternion();
const _qCur = new THREE.Quaternion();

/** Look-at point at eased progress e, written into `out`. */
function traverseTargetAt(
  shot: Pick<TraverseShot, "startView" | "endView" | "startDist" | "endDist">,
  camPos: THREE.Vector3,
  e: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const w = smoothstep(0, TURN_END_E, e);
  _qTurn.setFromUnitVectors(shot.startView, shot.endView);
  _qCur.identity().slerp(_qTurn, w);
  _view.copy(shot.startView).applyQuaternion(_qCur);
  return out
    .copy(camPos)
    .addScaledVector(
      _view,
      THREE.MathUtils.lerp(shot.startDist, shot.endDist, w),
    );
}

export function buildTraverse(
  from: Tableau,
  to: Tableau,
  startPos: THREE.Vector3,
  startTarget: THREE.Vector3,
  playbackSpeed = 1,
): TraverseShot {
  const endTarget = new THREE.Vector3(...to.camera.lookAt);
  const endPos = new THREE.Vector3(...to.camera.pos);

  // Cap the fly against the window it flies into.
  const windowMs = (tableauSeconds(to) * 1000) / playbackSpeed;
  const durationMs = Math.min(TRAVERSE_BASE_MS, windowMs);

  // Shrink the corridor with the duration to hold ground speed.
  const factor = Math.max(
    TRAVERSE_TRAVEL_FACTOR_MIN,
    TRAVERSE_TRAVEL_FACTOR * (durationMs / TRAVERSE_BASE_MS),
  );

  // Read live, so a user zoom or pan survives the crossing.
  const rel = startPos.clone().sub(startTarget);
  const n = rel.clone().normalize();

  const u = n
    .clone()
    .applyAxisAngle(WORLD_UP, TRAVERSE_SWING_RAD)
    .addScaledVector(WORLD_UP, TRAVERSE_LIFT)
    .normalize();

  const travel = endPos.distanceTo(endTarget) * factor;
  const startCam = endTarget.clone().addScaledVector(u, travel);

  const fromMoonPos = startCam.clone().sub(rel);
  const originA = fromMoonPos.clone().sub(startTarget);

  const mid = startCam.clone().lerp(endPos, 0.5);
  mid.addScaledVector(
    mid.clone().sub(endTarget).normalize(),
    TRAVERSE_BOW * travel,
  );

  const curve = new THREE.CatmullRomCurve3(
    [startCam, mid, endPos],
    false,
    "centripetal",
  );

  const startView = rel.clone().negate().normalize();
  const endView = endTarget.clone().sub(endPos).normalize();
  const views = {
    startView,
    endView,
    startDist: rel.length(),
    endDist: endPos.distanceTo(endTarget),
  };

  return {
    fromId: from.id,
    toId: to.id,
    fromBody: from.body ?? "",
    toBody: to.body ?? "",
    originA,
    curve,
    ...cassiniSeats(from, to, originA, curve, views),
    startTarget: fromMoonPos,
    endTarget,
    ...views,
    startFov: from.camera.fov ?? DEFAULT_TABLEAU_FOV,
    endFov: to.camera.fov ?? DEFAULT_TABLEAU_FOV,
    saturnFromPos: from.saturnBackdrop
      ? new THREE.Vector3(...from.saturnBackdrop.pos).add(originA)
      : null,
    saturnToPos: to.saturnBackdrop
      ? new THREE.Vector3(...to.saturnBackdrop.pos)
      : null,
    saturnFromScale: from.saturnBackdrop?.scale ?? 0,
    saturnToScale: to.saturnBackdrop?.scale ?? 0,
    durationMs,
  };
}

/** View basis at a camera pose, written into fwd / right / up. */
function viewBasis(
  camPos: THREE.Vector3,
  target: THREE.Vector3,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
  up: THREE.Vector3,
): void {
  fwd.copy(target).sub(camPos).normalize();
  right.copy(fwd).cross(WORLD_UP);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
  right.normalize();
  up.copy(right).cross(fwd).normalize();
}

const _bFwd = new THREE.Vector3();
const _bRight = new THREE.Vector3();
const _bUp = new THREE.Vector3();
const _bRel = new THREE.Vector3();
const _bTarget = new THREE.Vector3();

function cassiniSeats(
  from: Tableau,
  to: Tableau,
  originA: THREE.Vector3,
  camCurve: THREE.CatmullRomCurve3,
  views: Pick<TraverseShot, "startView" | "endView" | "startDist" | "endDist">,
): { seatA: THREE.Vector3; seatB: THREE.Vector3 } {
  const start = new THREE.Vector3(...(from.cassiniOffset ?? [0, 0, 0])).add(
    originA,
  );
  const end = new THREE.Vector3(...(to.cassiniOffset ?? [0, 0, 0]));

  const seatAt = (camPos: THREE.Vector3, p: THREE.Vector3, e: number) => {
    traverseTargetAt(views, camPos, e, _bTarget);
    viewBasis(camPos, _bTarget, _bFwd, _bRight, _bUp);
    _bRel.copy(p).sub(camPos);
    return new THREE.Vector3(
      _bRel.dot(_bRight),
      _bRel.dot(_bUp),
      _bRel.dot(_bFwd),
    );
  };

  return {
    seatA: seatAt(camCurve.getPoint(0), start, 0),
    seatB: seatAt(camCurve.getPoint(1), end, 1),
  };
}

/** Shot for a boundary by id, or null when it is not a moon -> moon pair. */
export function buildTraverseFor(
  prevId: string,
  nextId: string,
  startPos: THREE.Vector3,
  startTarget: THREE.Vector3,
  playbackSpeed = 1,
): TraverseShot | null {
  if (!isTraverseBoundary(prevId, nextId)) return null;
  const from = BY_ID.get(prevId);
  const to = BY_ID.get(nextId);
  if (!from || !to) return null;
  return buildTraverse(from, to, startPos, startTarget, playbackSpeed);
}

export interface TraverseSample {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

const _samplePos = new THREE.Vector3();
const _sampleTarget = new THREE.Vector3();

/**
 * Camera pose at eased progress e. Returns shared scratch vectors, so copy out
 * before the next call.
 */
export function sampleTraverse(shot: TraverseShot, e: number): TraverseSample {
  const c = Math.min(1, Math.max(0, e));
  // getPointAt, not getPoint: arc-length keeps the ground speed even.
  shot.curve.getPointAt(c, _samplePos);
  traverseTargetAt(shot, _samplePos, c, _sampleTarget);

  // Lerp in tan(fov/2) so the zoom rate feels constant.
  let fov = shot.endFov;
  if (shot.startFov !== shot.endFov) {
    const t0 = Math.tan(THREE.MathUtils.degToRad(shot.startFov / 2));
    const t1 = Math.tan(THREE.MathUtils.degToRad(shot.endFov / 2));
    fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(THREE.MathUtils.lerp(t0, t1, c)),
    );
  }
  return { pos: _samplePos, target: _sampleTarget, fov };
}

export interface TraverseMoonState {
  /** World seat for this moon during the crossing. */
  offset: THREE.Vector3;
  /** Multiplier on the moon's own tableau scale. */
  scaleMul: number;
}

const _moonOffset = new THREE.Vector3();

/**
 * Where `body` sits and how big it is at eased progress e, or null when the
 * body is not in this shot.
 */
export function traverseMoonState(
  shot: TraverseShot,
  body: string,
  e: number,
): TraverseMoonState | null {
  const c = Math.min(1, Math.max(0, e));
  if (body === shot.fromBody) {
    return {
      offset: _moonOffset.copy(shot.originA),
      scaleMul: 1 - smoothstep(FADE_START_E, FADE_END_E, c),
    };
  }
  if (body === shot.toBody) {
    return { offset: _moonOffset.set(0, 0, 0), scaleMul: 1 };
  }
  return null;
}

export interface TraverseSaturnState {
  pos: THREE.Vector3;
  scale: number;
}

const _saturnPos = new THREE.Vector3();

/**
 * Saturn's transform during the crossing, or null when either tableau has no
 * backdrop.
 */
export function traverseSaturn(
  shot: TraverseShot,
  e: number,
): TraverseSaturnState | null {
  if (!shot.saturnFromPos || !shot.saturnToPos) return null;
  const c = smoothstep(0, 1, Math.min(1, Math.max(0, e)));
  return {
    pos: _saturnPos.lerpVectors(shot.saturnFromPos, shot.saturnToPos, c),
    scale: THREE.MathUtils.lerp(shot.saturnFromScale, shot.saturnToScale, c),
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const _cPos = new THREE.Vector3();
const _cTarget = new THREE.Vector3();
const _cFwd = new THREE.Vector3();
const _cRight = new THREE.Vector3();
const _cUp = new THREE.Vector3();

/**
 * Cassini's world position at eased progress e, written into `out`, exact on
 * each tableau's own cassiniOffset at both ends.
 */
export function traverseCassiniPos(
  shot: TraverseShot,
  e: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const c = Math.min(1, Math.max(0, e));
  shot.curve.getPointAt(c, _cPos);
  traverseTargetAt(shot, _cPos, c, _cTarget);
  viewBasis(_cPos, _cTarget, _cFwd, _cRight, _cUp);
  return out
    .copy(_cPos)
    .addScaledVector(
      _cRight,
      THREE.MathUtils.lerp(shot.seatA.x, shot.seatB.x, c),
    )
    .addScaledVector(_cUp, THREE.MathUtils.lerp(shot.seatA.y, shot.seatB.y, c))
    .addScaledVector(
      _cFwd,
      THREE.MathUtils.lerp(shot.seatA.z, shot.seatB.z, c),
    );
}
