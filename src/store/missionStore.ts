import { create } from "zustand";

export type PlaybackSpeed = 1 | 2 | 5 | 10;
export type RenderMode = "space" | "blueprint" | "editorial";
export type ActiveModel =
  | "CassiniHuygensA.glb"
  | "CassiniHuygensAwithout_Cassini.glb"
  | "CassiniHuygensAwithoutHyugens.glb";
export type TitanSpectralMode = "visible" | "vims_ir" | "iss_cb3" | "iss_nac_ir";
export type EnceladusSpectralMode = "visible" | "vims_ir";
export type LightingMode = "natural" | "rim" | "full";

interface MissionState {
  currentT: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;

  activeComponent: string | null;
  openPhaseId: string | null;
  renderMode: RenderMode;
  titanSpectralMode: TitanSpectralMode;
  enceladusSpectralMode: EnceladusSpectralMode;
  lightingMode: LightingMode;
  activeModel: ActiveModel;
  showPlumes: boolean;
  showLabels: boolean;
  autoRotate: boolean;
  uiScale: number;
  cameraResetNonce: number;

  setTime: (t: number) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setActiveComponent: (id: string | null) => void;
  setOpenPhaseId: (id: string | null) => void;
  setRenderMode: (mode: RenderMode) => void;
  setTitanSpectralMode: (mode: TitanSpectralMode) => void;
  setEnceladusSpectralMode: (mode: EnceladusSpectralMode) => void;
  toggleLightingMode: () => void;
  togglePlumes: () => void;
  setActiveModel: (model: ActiveModel) => void;
  setUiScale: (scale: number) => void;
  resetCamera: () => void;
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
  titanSpectralMode: "visible",
  enceladusSpectralMode: "visible",
  lightingMode: "natural",
  activeModel: "CassiniHuygensA.glb",
  showPlumes: false,
  showLabels: false,
  autoRotate: true,
  uiScale: 1,
  cameraResetNonce: 0,

  setTime: (t) => set({ currentT: Math.max(0, Math.min(1, t)) }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  setActiveComponent: (activeComponent) => set({ activeComponent }),
  setOpenPhaseId: (openPhaseId) => set({ openPhaseId }),
  setRenderMode: (renderMode) => set({ renderMode }),
  setTitanSpectralMode: (titanSpectralMode) => set({ titanSpectralMode }),
  setEnceladusSpectralMode: (enceladusSpectralMode) =>
    set({ enceladusSpectralMode }),

  toggleLightingMode: () =>
    set((s) => {
      const next: Record<LightingMode, LightingMode> = {
        natural: "rim",
        rim: "full",
        full: "natural",
      };
      return { lightingMode: next[s.lightingMode] };
    }),

  togglePlumes: () => set((s) => ({ showPlumes: !s.showPlumes })),
  setActiveModel: (activeModel) => set({ activeModel, showLabels: false }),
  setUiScale: (uiScale) => set({ uiScale }),
  resetCamera: () => set((s) => ({ cameraResetNonce: s.cameraResetNonce + 1 })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
}));
