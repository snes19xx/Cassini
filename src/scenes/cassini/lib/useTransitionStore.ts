// Shared clock for the camera fly-through, so Cassini's offset, the drift
// constants and the moons' scales land on the frame the camera lands.

import { create } from "zustand";
import type { TraverseShot } from "./traverseShot";

export type TransitionPhase = "idle" | "flying";

interface TransitionStoreState {
  phase: TransitionPhase;
  flyStartMs: number;
  flyDurationMs: number;
  /** Set only for moon -> moon flies. */
  traverse: TraverseShot | null;
  setPhase: (phase: TransitionPhase) => void;
  setFly: (startMs: number, durationMs: number) => void;
  setTraverse: (shot: TraverseShot | null) => void;
}

export const useTransitionStore = create<TransitionStoreState>((set) => ({
  phase: "idle",
  flyStartMs: 0,
  flyDurationMs: 800,
  traverse: null,
  setPhase: (phase) => set({ phase }),
  setFly: (startMs, durationMs) =>
    set({ flyStartMs: startMs, flyDurationMs: durationMs }),
  setTraverse: (traverse) => set({ traverse }),
}));

// Shared so everything syncing to the camera reads the same curve.
export function easeInOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

interface FlyProgress {
  isFly: boolean;
  e: number;
  tNorm: number;
}

const IDLE_FLY: FlyProgress = { isFly: false, e: 0, tNorm: 0 };

let frameFly: FlyProgress = IDLE_FLY;
let frameTraverse: { shot: TraverseShot; e: number } | null = null;

// Call once per frame, before anything reads the clock.
export function beginTransitionFrame(): void {
  const s = useTransitionStore.getState();
  if (s.phase !== "flying" || s.flyStartMs === 0) {
    frameFly = IDLE_FLY;
    frameTraverse = null;
    return;
  }
  const elapsed = performance.now() - s.flyStartMs;
  const tNorm = Math.min(1, Math.max(0, elapsed / s.flyDurationMs));
  const e = easeInOutCubic(tNorm);
  frameFly = { isFly: true, e, tNorm };
  frameTraverse = s.traverse ? { shot: s.traverse, e } : null;
}

/** Eased fly progress in [0,1]; isFly is false while idle. */
export function getFlyProgress(): FlyProgress {
  return frameFly;
}

/** Live traverse shot and its eased progress, or null on every other fly. */
export function getTraverseProgress(): {
  shot: TraverseShot;
  e: number;
} | null {
  return frameTraverse;
}
