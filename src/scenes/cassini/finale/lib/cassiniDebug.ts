// src/scenes/cassini/finale/lib/cassiniDebug.ts
//
// Tunable plunge path and contrail for the terminal phase.

import { create } from "zustand";

export const CASSINI_PATH_DEBUG = false;

// The path is built against this fixed pose, so panning the live camera leaves
// it alone. Basis is fwd +X, up +Y, right +Z.
export const CAM_BASE = { x: -30, y: 12, z: 205 };

export interface CassiniDebugState {
  distance: number;
  entryRight: number;
  entryUp: number;
  exitRight: number;
  exitUp: number;
  speedEase: number; // 1 linear, below 1 fast start, above 1 slow start

  trailOpacity: number;
  trailWidth: number;
  trailLength: number;
  trailWander: number; // sideways waviness, 0 is a straight line

  // Descent-p window over which the model shrinks and fades into the meteor.
  meteorShrinkStart: number;
  meteorShrinkSpan: number;
  meteorMinScale: number;
  meteorMinOpacity: number;

  set: (patch: Partial<CassiniDebugState>) => void;
}

export const useCassiniDebugStore = create<CassiniDebugState>((set) => ({
  distance: 450,
  entryRight: -472,
  entryUp: 186,
  exitRight: 336,
  exitUp: 56,
  speedEase: 1.1,

  trailOpacity: 0.62,
  trailWidth: 1.4,
  // Must stay well under the path's ~818 unit length or the trail cap never
  // engages and the streak reaches all the way back to the entry point.
  trailLength: 300,
  trailWander: 1,

  meteorShrinkStart: 0.91,
  meteorShrinkSpan: 0.5,
  meteorMinScale: 0.5,
  meteorMinOpacity: 0.0,

  set: (patch) => set(patch),
}));
