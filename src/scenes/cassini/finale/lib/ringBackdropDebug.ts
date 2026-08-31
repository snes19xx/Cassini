// src/scenes/cassini/finale/lib/ringBackdropDebug.ts
//
// Knobs for the terminal ring backdrop, a camera-facing billboard carrying a
// baked band texture. The terminal camera is locked, so the card behaves as a
// screen-space element and its offsets read in screen terms.

import { create } from "zustand";

export const RING_BACKDROP_DEBUG = false;

export type RingSource = "procedural" | "textured";

export interface RingBackdropState {
  // Which rings get baked into the card: the finale shader, or the flat
  // saturn_rings.png the moon and Saturn tableaus use.
  ringSource: RingSource;

  distance: number;
  offsetRight: number;
  offsetUp: number;
  rollDeg: number;
  scaleX: number;
  scaleY: number;
  // The real band is wider overhead and converges toward the horizon. These
  // multiply scaleX at each edge, so equal values give a plain rectangle.
  topTaper: number;
  bottomTaper: number;
  curvature: number; // bow from the ring's arc
  opacity: number;
  horizonClip: number; // hides band below eye height

  // Fades the low-end skirt where the bake's grazing angle smears the inner edge.
  innerFadeStart: number;
  innerFadeEnd: number;

  // Grazing camera that foreshortens the annulus into a striped wall.
  bakeElev: number;
  bakeReach: number;
  bakeFov: number;
  bakeBrightness: number;

  set: (patch: Partial<RingBackdropState>) => void;
}

export const useRingBackdropStore = create<RingBackdropState>((set) => ({
  ringSource: "textured",

  distance: 1000,
  offsetRight: 81,
  offsetUp: 140,
  rollDeg: 72,
  scaleX: 936,
  scaleY: 900,
  topTaper: 2.5,
  bottomTaper: 1.76,
  curvature: 1.5,
  opacity: 0.77,
  horizonClip: 0,
  innerFadeStart: 0.28,
  innerFadeEnd: 0.4,

  bakeElev: 200,
  bakeReach: 335,
  bakeFov: 51,
  bakeBrightness: 1.1,

  set: (patch) => set(patch),
}));
