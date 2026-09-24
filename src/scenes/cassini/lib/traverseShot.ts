// Camera script for moon -> moon boundaries. Every single-moon tableau parks
// its moon at the world origin, so both moons of a boundary sit on one point.

import * as THREE from "three";
import { TABLEAUS, type Tableau } from "../data/tableaus";

/** Start distance from the incoming moon, as a multiple of its preset orbit. */
export const TRAVERSE_TRAVEL_FACTOR = 9;

/** Floor for that multiple once playback speed has shortened the fly. */
export const TRAVERSE_TRAVEL_FACTOR_MIN = 3;

// Swings the corridor off the current view axis so the departing moon is not on
// the flight line. 28 deg passes it at about 3 radii.
export const TRAVERSE_SWING_RAD = (28 * Math.PI) / 180;

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
  /** Unit view bearings at e=0 and e=1, about 1 deg apart. */
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
