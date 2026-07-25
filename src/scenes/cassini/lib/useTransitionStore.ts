// Tiny zustand slice for the camera fly-through. `phase` gates React state
// (SceneControls suppresses autoRotate/disables controls while flying).
// flyStartMs/flyDurationMs let any useFrame consumer recompute the same
// eased progress as the camera lerp, so Cassini's offset and the moons'
// scales land on the same frame instead of finishing at staggered times.

import { create } from "zustand";

export type TransitionPhase = "idle" | "flying";

interface TransitionStoreState {
  phase: TransitionPhase;
  flyStartMs: number;
  flyDurationMs: number;
  setPhase: (phase: TransitionPhase) => void;
  setFly: (startMs: number, durationMs: number) => void;
}

export const useTransitionStore = create<TransitionStoreState>((set) => ({
  phase: "idle",
  flyStartMs: 0,
  flyDurationMs: 800,
  setPhase: (phase) => set({ phase }),
  setFly: (startMs, durationMs) =>
    set({ flyStartMs: startMs, flyDurationMs: durationMs }),
}));

// Shared so every consumer syncing to the camera reads the same curve.
export function easeInOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

// Per-frame read via getState() (no subscription, no re-render). Returns
// { isFly: false } when idle; otherwise the eased progress in [0,1].
export function getFlyProgress(): { isFly: boolean; e: number; tNorm: number } {
  const s = useTransitionStore.getState();
  if (s.phase !== "flying" || s.flyStartMs === 0) {
    return { isFly: false, e: 0, tNorm: 0 };
  }
  const elapsed = performance.now() - s.flyStartMs;
  const tNorm = Math.min(1, Math.max(0, elapsed / s.flyDurationMs));
  return { isFly: true, e: easeInOutCubic(tNorm), tNorm };
}
