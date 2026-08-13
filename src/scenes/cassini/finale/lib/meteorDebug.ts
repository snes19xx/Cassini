// src/scenes/cassini/finale/lib/meteorDebug.ts
//
// Break-up shower knobs. Each fragment peels off at its own emission point
// along the route, so the debris strews the whole crossing instead of bursting
// at one instant.

import { create } from "zustand";

export const METEOR_DEBUG = false;

// Every fragment is its own Trail draw, so this caps the live count.
export const METEOR_MAX_COUNT = 60;

export interface MeteorDebugState {
  count: number;
  spread: number; // world units a fragment drifts from its shed point
  splitStart: number; // fraction of the route before shedding begins
  elongation: number; // drift back along the travel axis
  fan: number; // multiplier on the perpendicular drift, so cone width

  gravity: number; // downward bend added as a fragment ages
  burstEase: number; // lateral burst exponent, below 0.5 is snappier
  vBias: number; // vertical share of the side fan
  waver: number; // S-bend depth
  waverFreq: number; // bends along one streak

  streakLength: number;
  streakWidth: number;
  headSize: number;
  decay: number; // higher fades the streak faster

  warmth: number; // 0 white-hot, 1 deep red
  brightness: number; // HDR magnitude, feeds the bloom
  bloomIntensity: number;
  bloomThreshold: number;

  set: (patch: Partial<MeteorDebugState>) => void;
}

export const useMeteorDebugStore = create<MeteorDebugState>((set) => ({
  count: 44,
  spread: 30,
  splitStart: 0.0,
  elongation: 1.0,
  fan: 1.0,

  gravity: 0.25,
  burstEase: 0.5,
  vBias: 0.6,
  waver: 0.12,
  waverFreq: 6.0,

  streakLength: 48,
  streakWidth: 2.4,
  headSize: 0.5,
  decay: 1.2,

  warmth: 0.45,
  brightness: 7.5,
  bloomIntensity: 2.8,
  bloomThreshold: 3.0,

  set: (patch) => set(patch),
}));
