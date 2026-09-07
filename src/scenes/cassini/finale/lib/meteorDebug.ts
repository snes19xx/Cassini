// src/scenes/cassini/finale/lib/meteorDebug.ts
//
// Break-up shower knobs. Each fragment peels off at its own emission point
// along the route, strewing the debris across the whole crossing.

import { create } from "zustand";

export const METEOR_DEBUG = import.meta.env.DEV && false;

// Every fragment is its own Trail draw, so this caps the live count.
export const METEOR_MAX_COUNT = 60;

export interface MeteorDebugState {
  count: number;
  spread: number; // drift from shed point
  splitStart: number; // route fraction before shedding
  elongation: number; // drift along travel axis
  fan: number; // perpendicular drift multiplier

  gravity: number; // downward bend with age
  burstEase: number; // lateral burst exponent
  vBias: number; // side-fan vertical share
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
