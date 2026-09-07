import { create } from "zustand";
import type { InspectionViewId } from "../scenes/cassini/data/inspectionViews";

export type PlaybackSpeed = 1 | 2 | 5 | 10;
export type RenderMode = "space" | "blueprint" | "editorial";
export type ActiveModel =
  | "CassiniHuygensA.glb"
  | "CassiniHuygensAwithout_Cassini.glb"
  | "CassiniHuygensAwithoutHyugens.glb";
export type TitanSpectralMode =
  | "visible"
  | "vims_ir"
  | "iss_cb3"
  | "iss_nac_ir";
export type EnceladusSpectralMode = "visible" | "vims_ir";
export type LightingMode = "natural" | "rim" | "full";

// ring-dive segmented control, only shown during finale_ring_dive
export type FinaleCameraMode =
  | "thirdPerson" // chase-cam behind Cassini
  | "pov" // forward along velocity
  | "wide"; // pulled back, whole loop

const LABEL_MODEL: ActiveModel = "CassiniHuygensA.glb";

// override replaces the theme default; panel and button both call this
export const infoPanelVisible = (s: {
  infoPanelOverride: "on" | "off" | null;
  renderMode: RenderMode;
  showLabels: boolean;
}): boolean =>
  s.infoPanelOverride !== null
    ? s.infoPanelOverride === "on"
    : s.renderMode === "blueprint" ||
      (s.renderMode === "editorial" && s.showLabels);

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

  // orthogonal view (TOP/FRONT/REAR/MAG); null is free orbit, labels off
  inspectionView: InspectionViewId | null;
  // bumped on re-click, forces a re-snap after camera drift
  inspectionViewNonce: number;

  // model active before labels swapped it to LABEL_MODEL
  _preLabelModel: ActiveModel;

  // null defers to the per-theme default
  infoPanelOverride: "on" | "off" | null;

  finaleCameraMode: FinaleCameraMode;

  // theme stashed entering the terminal descent, restored on exit. null if
  // nothing to restore: pre-terminal, already in space, or picked manually
  _preTerminalRenderMode: RenderMode | null;

  // marks an auto-pause from opening a panel, not a manual pause
  resumeOnPanelClose: boolean;
  resumeOnPopoverClose: boolean;

  setTime: (t: number) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setActiveComponent: (id: string | null) => void;
  setOpenPhaseId: (id: string | null) => void;
  setRenderMode: (mode: RenderMode) => void;
  enterTerminalTheme: () => void;
  exitTerminalTheme: () => void;
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
  toggleInfoPanel: () => void;
  setFinaleCameraMode: (mode: FinaleCameraMode) => void;
  cycleFinaleCameraMode: () => void;
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
  infoPanelOverride: null,
  finaleCameraMode: "thirdPerson",
  _preTerminalRenderMode: null,
  resumeOnPanelClose: false,
  resumeOnPopoverClose: false,

  setTime: (t) => set({ currentT: Math.max(0, Math.min(1, t)) }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  setActiveComponent: (activeComponent) =>
    set((s) => {
      if (activeComponent && s.isPlaying) {
        return { activeComponent, isPlaying: false, resumeOnPanelClose: true };
      }
      if (!activeComponent && s.resumeOnPanelClose) {
        return {
          activeComponent: null,
          isPlaying: true,
          resumeOnPanelClose: false,
        };
      }
      return { activeComponent };
    }),

  setOpenPhaseId: (openPhaseId) =>
    set((s) => {
      if (openPhaseId && s.isPlaying) {
        return { openPhaseId, isPlaying: false, resumeOnPopoverClose: true };
      }
      if (!openPhaseId && s.resumeOnPopoverClose) {
        return {
          openPhaseId: null,
          isPlaying: true,
          resumeOnPopoverClose: false,
        };
      }
      return { openPhaseId };
    }),
  setRenderMode: (renderMode) => {
    // clears the stash so exiting the descent later won't revert this pick
    set({ renderMode, _preTerminalRenderMode: null });
  },

  // blueprint is disallowed from SATURN'S ATMOSPHERE onward, the photoreal
  // terminal sky breaks the wireframe
  enterTerminalTheme: () =>
    set((s) =>
      s.renderMode !== "blueprint"
        ? s
        : { _preTerminalRenderMode: s.renderMode, renderMode: "space" },
    ),

  exitTerminalTheme: () =>
    set((s) =>
      s._preTerminalRenderMode === null
        ? s
        : {
            renderMode: s._preTerminalRenderMode,
            _preTerminalRenderMode: null,
          },
    ),
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

  // pins the opposite of the current effective visibility
  toggleInfoPanel: () =>
    set((s) => ({ infoPanelOverride: infoPanelVisible(s) ? "off" : "on" })),

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
          // defaults to TOP so labels show right away; nonce forces a
          // re-snap even if inspectionView was already "top"
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

  setFinaleCameraMode: (mode) => set({ finaleCameraMode: mode }),

  cycleFinaleCameraMode: () =>
    set((s) => {
      const next: Record<FinaleCameraMode, FinaleCameraMode> = {
        thirdPerson: "pov",
        pov: "wide",
        wide: "thirdPerson",
      };
      return { finaleCameraMode: next[s.finaleCameraMode] };
    }),

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
      infoPanelOverride: null,
      finaleCameraMode: "thirdPerson",
      _preTerminalRenderMode: null,
    })),
}));
