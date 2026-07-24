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

// Ring-dive camera modes, surfaced as a 3-button segmented control while
// the finale_ring_dive tableau is active.
//   thirdPerson: chase-cam behind Cassini, Saturn ahead.
//   pov: first-person from Cassini, looking forward along velocity.
//   wide: pulled-back external camera framing the whole tilted loop.
export type FinaleCameraMode = "thirdPerson" | "pov" | "wide";

const LABEL_MODEL: ActiveModel = "CassiniHuygensA.glb";

// Effective mission-panel visibility: user pin wins, otherwise the
// per-theme defaults. Shared by InfoPanelGate (render) and the INFOPANEL
// chrome button (pressed state) so the two can never disagree.
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

  // User pin on the mission info panel. Null defers to infoPanelVisible's
  // per-theme default.
  infoPanelOverride: "on" | "off" | null;

  // Consumed by FinaleCameraDirector to pick the chase, first-person, or
  // pulled-back framing.
  finaleCameraMode: FinaleCameraMode;
  // Bumped whenever finaleCameraMode is set, even to its current value, so
  // FinaleCameraDirector can force a clean re-snap after the camera drifts.
  finaleCameraModeNonce: number;

  // Theme stashed on entering the terminal descent, restored on exit. Null
  // when no restore is pending: pre-terminal, entered already in SPACE, or
  // the user picked a theme manually during the descent (a manual pick
  // wins over the stash).
  _preTerminalRenderMode: RenderMode | null;

  // Set when opening a panel/popover auto-paused playback, so closing it
  // resumes only if the panel itself was the reason it paused.
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
  finaleCameraModeNonce: 0,
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
    // A manual theme pick always clears the terminal restore stash. If the
    // user chooses EDITORIAL mid-descent, scrubbing back out must not yank
    // them to the stashed pre-terminal theme.
    set({ renderMode, _preTerminalRenderMode: null });
  },

  // From SATURN'S ATMOSPHERE onward, BLUEPRINT is disallowed since the
  // terminal stage is authored against the photoreal sky and the wireframe
  // breaks it. Only BLUEPRINT gets forced to SPACE; EDITORIAL and SPACE are
  // left alone.
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

  // Pin the panel to the opposite of whatever is effectively showing, so
  // the button always does what it visually promises.
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

  setFinaleCameraMode: (mode) =>
    set((s) => ({
      finaleCameraMode: mode,
      finaleCameraModeNonce: s.finaleCameraModeNonce + 1,
    })),

  cycleFinaleCameraMode: () =>
    set((s) => {
      const next: Record<FinaleCameraMode, FinaleCameraMode> = {
        thirdPerson: "pov",
        pov: "wide",
        wide: "thirdPerson",
      };
      return {
        finaleCameraMode: next[s.finaleCameraMode],
        finaleCameraModeNonce: s.finaleCameraModeNonce + 1,
      };
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
      finaleCameraModeNonce: s.finaleCameraModeNonce + 1,
      _preTerminalRenderMode: null,
    })),
}));
