// src/scenes/cassini/finale/lib/finaleRingsDebug.ts
//
// Knobs for the live finale rings, both the procedural disk and the particle
// field. Every default mirrors the hard-coded constant it stands in for, so
// mounting the store changes nothing until a slider moves.

import { create } from "zustand";

export const FINALE_RINGS_DEBUG = false;

// The InstancedMesh cannot grow past its allocation, so it is built at this
// capacity and `partCount` only controls how many of them draw.
export const PARTICLE_MAX_CAPACITY = 80000;

export interface FinaleRingsState {
  ringR: number;
  ringG: number;
  ringB: number;
  ringOpacity: number;
  swirlBase: number; // noise floor, noise = swirlBase + n * swirlAmount
  swirlAmount: number;
  swirlBakeTime: number; // which frozen swirl frame to bake
  bakeRev: number;

  texOpacity: number; // 0 skips the layer entirely

  partCount: number;
  partSize: number;
  partJitter: number;
  partOpacity: number;
  partR: number;
  partG: number;
  partB: number;
  partBrightness: number;

  set: (patch: Partial<FinaleRingsState>) => void;
  commitBake: () => void;
}

export const useFinaleRingsStore = create<FinaleRingsState>((set) => ({
  ringR: 1.0,
  ringG: 0.82,
  ringB: 0.57,
  ringOpacity: 0.46,
  swirlBase: 0.73,
  // At 0 the procedural swirl contributes nothing and the textured layer
  // below carries all the ring detail.
  swirlAmount: 0.0,
  swirlBakeTime: 0.0,
  bakeRev: 0,

  texOpacity: 0.41,

  partCount: 25000,
  partSize: 0.54,
  partJitter: 0.7,
  partOpacity: 1.0,
  partR: 0.94,
  partG: 0.86,
  partB: 0.72,
  partBrightness: 1.3,

  set: (patch) => set(patch),
  // Bumping bakeRev is what forces the noise texture to rebuild.
  commitBake: () => set((s) => ({ bakeRev: s.bakeRev + 1 })),
}));
