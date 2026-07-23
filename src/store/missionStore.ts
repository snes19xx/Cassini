import { create } from "zustand";

export type PlaybackSpeed = 1 | 2 | 5 | 10;
export type RenderMode = "space" | "blueprint" | "editorial";
export type ActiveModel =
  | "CassiniHuygensA.glb"
  | "CassiniHuygensAwithout_Cassini.glb"
  | "CassiniHuygensAwithoutHyugens.glb";

interface MissionState {
  currentT: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;

  activeComponent: string | null;
  openPhaseId: string | null;
  renderMode: RenderMode;
  activeModel: ActiveModel;
  showLabels: boolean;
  autoRotate: boolean;

  setTime: (t: number) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setActiveComponent: (id: string | null) => void;
  setOpenPhaseId: (id: string | null) => void;
  setRenderMode: (mode: RenderMode) => void;
  setActiveModel: (model: ActiveModel) => void;
  toggleLabels: () => void;
  toggleAutoRotate: () => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  currentT: 0,
  isPlaying: false,
  playbackSpeed: 1,
  activeComponent: null,
  openPhaseId: null,
  renderMode: "blueprint",
  activeModel: "CassiniHuygensA.glb",
  showLabels: false,
  autoRotate: true,

  setTime: (t) => set({ currentT: Math.max(0, Math.min(1, t)) }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  setActiveComponent: (activeComponent) => set({ activeComponent }),
  setOpenPhaseId: (openPhaseId) => set({ openPhaseId }),
  setRenderMode: (renderMode) => set({ renderMode }),
  setActiveModel: (activeModel) => set({ activeModel, showLabels: false }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
}));
