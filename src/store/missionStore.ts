import { create } from "zustand";
import type { InspectionViewId } from "../scenes/cassini/data/inspectionViews";

export type PlaybackSpeed = 1 | 2 | 5 | 10;
export type RenderMode = "space" | "blueprint" | "editorial";
export type ActiveModel =
  | "CassiniHuygensA.glb"
  | "CassiniHuygensAwithout_Cassini.glb"
  | "CassiniHuygensAwithoutHyugens.glb";
export type TitanSpectralMode = "visible" | "vims_ir" | "iss_cb3" | "iss_nac_ir";
export type EnceladusSpectralMode = "visible" | "vims_ir";
export type LightingMode = "natural" | "rim" | "full";

const LABEL_MODEL: ActiveModel = "CassiniHuygensA.glb";

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

  // Guided inspection: which orthogonal view (TOP / FRONT / REAR / MAG) is
  // active. Only meaningful when showLabels is true on the homepage. Null
  // means free orbit with labels suppressed.
  inspectionView: InspectionViewId | null;
  // Bumped when the same inspection-view button is clicked again, so
  // Spacecraft.tsx can force a re-snap if the user orbited away since.
  inspectionViewNonce: number;

  // Model shown before label mode swapped it to LABEL_MODEL, restored when
  // labels are toggled back off.
  _preLabelModel: ActiveModel;

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
  setInspectionView: (view: InspectionViewId | null) => void;
  reset: () => void;
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
  inspectionView: "top",
  inspectionViewNonce: 0,
  _preLabelModel: "CassiniHuygensA.glb",

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
  toggleLabels: () =>
    set((s) => {
      if (!s.showLabels) {
        return {
          showLabels: true,
          _preLabelModel: s.activeModel,
          activeModel: LABEL_MODEL,
          cameraResetNonce: s.cameraResetNonce + 1,
          // Default to TOP so labels are visible immediately, no empty
          // intermediate state. Bump nonce so the camera re-snaps even if
          // the previous toggle-off left inspectionView at "top" already.
          inspectionView: "top",
          inspectionViewNonce: s.inspectionViewNonce + 1,
        };
      } else {
        return {
          showLabels: false,
          activeModel: s._preLabelModel,
          cameraResetNonce: s.cameraResetNonce + 1,
          inspectionView: null,
        };
      }
    }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),

  setInspectionView: (view) =>
    set((s) => ({
      inspectionView: view,
      inspectionViewNonce:
        view !== null ? s.inspectionViewNonce + 1 : s.inspectionViewNonce,
    })),

  reset: () =>
    set((s) => ({
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
      cameraResetNonce: s.cameraResetNonce + 1,
      inspectionView: "top",
      _preLabelModel: "CassiniHuygensA.glb",
    })),
}));
