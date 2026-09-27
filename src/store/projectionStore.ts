import { create } from "zustand";

export interface ProjectedPoint {
  id: string;
  screenX: number;
  screenY: number;
  facing: boolean;
  depth: number;
  onScreen: boolean;
  y: number;
}

interface ProjectionState {
  projections: Record<string, ProjectedPoint>;
  viewport: { width: number; height: number };
  // One store update per frame covering every anchor's projection.
  setProjections: (patch: Record<string, ProjectedPoint>) => void;
  setViewport: (width: number, height: number) => void;
}

export const useProjectionStore = create<ProjectionState>((set) => ({
  projections: {},
  viewport: { width: 0, height: 0 },
  setProjections: (patch) =>
    set((s) => ({
      projections: { ...s.projections, ...patch },
    })),
  setViewport: (width, height) => set({ viewport: { width, height } }),
}));
