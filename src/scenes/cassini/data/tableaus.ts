// src/scenes/cassini/data/tableaus.ts
//
// Tableau-based mission representation. Each tableau is a self-contained
// scene: Cassini + at most one focal subject (a moon, Saturn, or nothing),
// with its own camera preset, zoom clamps, and optional far-distance Saturn
// backdrop. The timeline maps `currentT` to exactly one active tableau via
// `getActiveTableau(t)`. Tableau windows are non-overlapping and cover [0,1].
//
// This replaces the continuous-physics flyby system: instead of moons moving
// along Catmull-Rom splines around a moving Saturn, each moon sits at a fixed
// world position inside its tableau, Cassini sits next to it, the user can
// freely orbit the pair, and Saturn (when shown) is a static far-distance
// backdrop chosen for visual composition rather than physical accuracy.

export type TableauKind =
  | "cruise"           // Cassini alone in starfield
  | "saturn_focus"     // Saturn + rings dominant (SOI / late beauty / finale)
  | "moon"             // Cassini + a moon, optional far Saturn backdrop
  | "finale";          // Saturn dominant, Cassini disintegrating

export interface SaturnBackdrop {
  /** World-space position of Saturn for this moon tableau. */
  pos: [number, number, number];
  /** Uniform scale applied to the Saturn group (rings included). */
  scale: number;
  /**
   * Optional orientation of the whole Saturn group, XYZ euler in degrees.
   * Default [0,0,0]. family_portrait tips this a few degrees: at zero tilt
   * the camera sits exactly in the ring plane and the rings collapse to a
   * hairline.
   */
  rotDeg?: [number, number, number];
}

/**
 * A moon placed at an explicit position inside a multi-moon tableau (the
 * NASA group-portrait scenes), instead of sitting at the tableau's origin.
 */
export interface TableauMoonPlacement {
  /** Matches the textureService MoonId set. */
  body: string;
  pos: [number, number, number];
  /** Same stylized-scale system as moonEffectiveRadius. */
  effectiveRadius: number;
  /**
   * Tidally locked, so spin axis = orbit normal: tilt from the ring-plane
   * normal by the moon's orbital inclination to Saturn's equator. Degrees.
   */
  axialTiltDeg?: number;
  /** Sidereal rotation period in hours, equal to orbital period (tidal lock). */
  spinPeriodHours?: number;
  /**
   * Hand-tuned drift rate about the backdrop Saturn's ring axis, rad/s of
   * mission display time. The backdrop sits at a photo-composed distance
   * rather than true orbital radii, so true periods either freeze near
   * moons or fling far ones out of frame.
   */
  orbitRadPerSec?: number;
}

export interface ZoomClamps {
  /** Minimum camera distance to the tableau target, prevents zooming inside the subject. */
  minDist: number;
  /** Maximum camera distance, prevents the subject shrinking to a dot. */
  maxDist: number;
}

export interface CameraPreset {
  pos: [number, number, number];
  lookAt: [number, number, number];
  /**
   * Optional per-tableau focal length in degrees (default 45). The NASA
   * group portraits use a narrow fov, a real long-lens shot, so distant
   * bodies compress into one frame while dollying in still separates them.
   */
  fov?: number;
}

// Every path that changes camera fov must restore it to the tableau's value.
export const DEFAULT_TABLEAU_FOV = 45;

export interface Tableau {
  id: string;
  kind: TableauKind;
  /** Inclusive start, exclusive end. Windows are non-overlapping. */
  tStart: number;
  tEnd: number;
  /** Phase label shown in chrome, usually matches a phase in phases.ts. */
  label: string;
  /** Body identifier for moon tableaus (titan/iapetus/enceladus/mimas/rhea/dione). */
  body?: string;
  /**
   * For moon tableaus: where Cassini sits relative to the moon (which is at
   * origin in this tableau's frame). For other tableaus: ignored.
   */
  cassiniOffset?: [number, number, number];
  /**
   * Effective rendered radius the moon should appear at, regardless of its
   * real-world body radius. Lets us stylize the relative scale (Titan biggest,
   * Mimas smallest) without depending on per-flyby scale data.
   */
  moonEffectiveRadius?: number;
  /**
   * Multi-moon composition (group-portrait tableaus). Each moon renders at
   * its own position/size; `body`/`moonEffectiveRadius` stay unset. moons[0]
   * gets the hi-res texture slot, so the dominant foreground moon goes first.
   */
  moons?: TableauMoonPlacement[];
  /** Camera framing the user sees on tableau enter (resets via JUMP-TO). */
  camera: CameraPreset;
  /**
   * Optional override for JUMP-TO's landing point inside this tableau's
   * window. Defaults to `tStart + 1e-5`. Used by `saturn_arrival` so the
   * JUMP-TO drops the user partway into the scale ramp where Saturn is
   * already "football-sized" instead of at the start where it's invisible.
   */
  jumpT?: number;
  /** Bounds OrbitControls' zoom range while this tableau is active. */
  zoom: ZoomClamps;
  /**
   * Optional override for OrbitControls' autoRotateSpeed (default is
   * kind/fov-derived). family_portrait sets 0: through its 6° lens a few
   * degrees of drift slides a wing moon out of frame, so the moons' own
   * axial spin provides motion instead.
   */
  autoRotateSpeed?: number;
  /**
   * Optional OrbitControls rotation clamps, radians. Group-portrait
   * compositions place bodies far off the orbit target; without this the
   * user can orbit straight through a background moon. Azimuth 0 faces +Z,
   * polar is measured from +Y (pi/2 = equatorial).
   */
  orbitLimits?: {
    minAzimuth: number;
    maxAzimuth: number;
    minPolar: number;
    maxPolar: number;
  };
  /**
   * Optional Saturn rendered at a fixed offset for visual context. Only set
   * for moon tableaus; saturn_focus / finale render Saturn at origin instead.
   * Per-moon variance gives each tableau its own composition.
   */
  saturnBackdrop?: SaturnBackdrop;
  /** Per-tableau effects toggled by the resolver (huygens descent, plumes, etc). */
  effects?: {
    huygensDescent?: boolean;     // Titan tableau: show Huygens probe + DISR channels
    plumes?: boolean;             // Enceladus tableau: south-pole geyser jets
    rings?: boolean;              // Saturn shown with rings (default true when saturn rendered)
    crescentLighting?: boolean;   // backlit sun rig, thin crescents (three_crescents)
    hideCassini?: boolean;        // "WE are Cassini" shots, the spacecraft model is the camera
    grandFinaleBurn?: boolean;    // Cassini disintegration FX
    soiBurn?: boolean;            // SOI engine burn glow
  };
}

// Saturn body radius is 180; rings extend to 419. With moons at fixed effective
// radius ~25-50, putting Saturn at distance >=1500 keeps it visibly far without
// crowding the moon. Scale is exaggerated: real Saturn subtends ~1 degree; here it's 5-15.

export const TABLEAUS: Tableau[] = [
  // No Saturn, no moons yet: pure cruise. Window is short so the arrival
  // burn below has room to show Saturn growing from a dot to full size.
  {
    id: "cruise_early",
    kind: "cruise",
    tStart: 0.0,
    tEnd: 0.180,
    label: "CRUISE",
    camera: {
      pos: [25, 12, 45],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 18, maxDist: 200 },
  },

  // Saturn grows from a dot at tStart to full size by tEnd; the SOI burn
  // (stateAt.ts) fires most of the way through, against a near-full Saturn.
  // Chase-cam behind Cassini keeps it foreground while Saturn fills the
  // background. JUMP-TO lands mid-ramp rather than at tStart, so Saturn
  // already reads as something instead of a blank dot.
  {
    id: "saturn_arrival",
    kind: "saturn_focus",
    tStart: 0.180,
    tEnd: 0.353,
    label: "SATURN ORBIT INSERTION",
    cassiniOffset: [0, 20, 700],
    camera: {
      pos: [0, 90, 980],
      lookAt: [0, 0, 0],
    },
    jumpT: 0.235,
    zoom: { minDist: 200, maxDist: 4000 },
    effects: { rings: true, soiBurn: true },
  },

  // Huygens probe descends here (HuygensSeparation.tsx). Titan sits 1.22M km
  // from Saturn (~5.6° apparent), so the backdrop reads small.
  {
    id: "titan_huygens",
    kind: "moon",
    tStart: 0.353,
    tEnd: 0.420,
    label: "HUYGENS LANDS ON TITAN",
    body: "titan",
    moonEffectiveRadius: 50,
    cassiniOffset: [70, 18, 35],
    camera: {
      pos: [110, 40, 220],
      lookAt: [0, 0, 0],
    },
    // minDist: keep camera at least ~30% beyond the moon surface so
    // zooming all the way in can't put the camera inside the body
    // (a known OrbitControls / near-plane crash mode).
    zoom: { minDist: 70, maxDist: 2200 },
    saturnBackdrop: {
      pos: [-1900, -180, -1300],
      scale: 0.4,
    },
    effects: { huygensDescent: true, rings: true },
  },

  // Enceladus sits close to Saturn (~238k km, ~29° apparent), so the backdrop reads big.
  {
    id: "enceladus",
    kind: "moon",
    tStart: 0.420,
    tEnd: 0.490,
    label: "ENCELADUS — ACTIVE WORLD",
    body: "enceladus",
    moonEffectiveRadius: 24,
    cassiniOffset: [38, -8, 18],
    camera: {
      pos: [60, 25, 130],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 34, maxDist: 1600 },
    saturnBackdrop: {
      pos: [-1100, 80, -1300],
      scale: 1.05,
    },
    effects: { rings: true },
  },

  // Farthest of these moons (3.56M km, ~1.9° apparent), so Saturn is smallest here.
  {
    id: "iapetus",
    kind: "moon",
    tStart: 0.490,
    tEnd: 0.580,
    label: "IAPETUS — TWO-TONED MOON",
    body: "iapetus",
    moonEffectiveRadius: 32,
    cassiniOffset: [44, 10, 26],
    camera: {
      pos: [70, 30, 160],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 44, maxDist: 1800 },
    saturnBackdrop: {
      pos: [-2400, 280, -1800],
      scale: 0.22,
    },
    effects: { rings: true },
  },

  // Closest of these moons to Saturn (185k km, ~37° apparent), so the backdrop is largest.
  {
    id: "mimas",
    kind: "moon",
    tStart: 0.580,
    tEnd: 0.640,
    label: "MIMAS — DEATH STAR MOON",
    body: "mimas",
    moonEffectiveRadius: 18,
    cassiniOffset: [28, -4, 14],
    camera: {
      pos: [42, 15, 95],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 26, maxDist: 1400 },
    saturnBackdrop: {
      pos: [-650, -40, -520],
      scale: 1.4,
    },
    effects: { rings: true },
  },

  // Third-closest of these moons (294k km, ~23° apparent); backdrop sits
  // between Enceladus and Dione in scale.
  {
    id: "tethys",
    kind: "moon",
    tStart: 0.640,
    tEnd: 0.690,
    label: "TETHYS — ICE WORLD",
    body: "tethys",
    moonEffectiveRadius: 26,
    cassiniOffset: [40, 6, 22],
    camera: {
      pos: [62, 24, 140],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 36, maxDist: 1600 },
    saturnBackdrop: {
      pos: [-1100, 60, -1100],
      scale: 0.9,
    },
    effects: { rings: true },
  },

  // Dione (377k km, ~18° apparent). Backdrop runs a touch large here for
  // visual weight, though still smaller than Tethys.
  {
    id: "dione",
    kind: "moon",
    tStart: 0.690,
    tEnd: 0.745,
    label: "DIONE — WISPY TERRAIN",
    body: "dione",
    moonEffectiveRadius: 28,
    cassiniOffset: [38, -10, 20],
    camera: {
      pos: [60, 22, 140],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 38, maxDist: 1700 },
    saturnBackdrop: {
      pos: [-1200, -120, -1000],
      scale: 0.75,
    },
    effects: { rings: true },
  },

  // Rhea (527k km, ~13° apparent): backdrop smaller than at Dione, larger than at Titan.
  {
    id: "rhea",
    kind: "moon",
    tStart: 0.745,
    tEnd: 0.810,
    label: "RHEA — ICY SISTER",
    body: "rhea",
    moonEffectiveRadius: 30,
    cassiniOffset: [42, 8, 22],
    camera: {
      pos: [68, 28, 150],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 42, maxDist: 1700 },
    saturnBackdrop: {
      pos: [-1500, 120, -1300],
      scale: 0.55,
    },
    effects: { rings: true },
  },

  // ── 9. Late Saturn Beauty (hexagon, equinox-style) ──────────────────────
  // Saturn dominant, no moon. Used for the late-mission Saturn beauty shots.
  {
    id: "saturn_beauty",
    kind: "saturn_focus",
    tStart: 0.810,
    tEnd: 0.960,
    label: "SATURN STUDIES",
    camera: {
      pos: [0, 320, 480],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 200, maxDist: 4000 },
    effects: { rings: true },
  },

  // ── 10. Grand Finale ────────────────────────────────────────────────────
  // Saturn fills frame, ring-crossings flash, Cassini disintegrates.
  {
    id: "grand_finale",
    kind: "finale",
    tStart: 0.960,
    tEnd: 1.0001, // include t=1.0 inclusively
    label: "THE GRAND FINALE",
    camera: {
      pos: [220, 60, 380],
      lookAt: [0, 0, 0],
    },
    zoom: { minDist: 150, maxDist: 3500 },
    effects: { rings: true, grandFinaleBurn: true },
  },
];

/**
 * Pick the active tableau for a given mission t. Windows are non-overlapping
 * and cover [0, 1]; this returns the unique match, or the cruise tableau as
 * a fallback for any t outside the defined windows.
 */
export function getActiveTableau(t: number): Tableau {
  for (const tab of TABLEAUS) {
    if (t >= tab.tStart && t < tab.tEnd) return tab;
  }
  return TABLEAUS[0]!;
}

/** Index of the active tableau (for arrow-key navigation in App.tsx). */
export function findActiveTableauIndex(t: number): number {
  for (let i = TABLEAUS.length - 1; i >= 0; i--) {
    if (t >= TABLEAUS[i]!.tStart) return i;
  }
  return 0;
}

/**
 * Map a tableau to its `BODY_CONTENT` key (in `phases.ts`).
 *   - moon tableaus use their `body` field
 *   - both saturn_focus tableaus (arrival + studies) share `"saturn"`
 *   - finale uses `"grand_finale"`
 *   - cruise has no body content (returns null, InfoPanel shows cruise UI)
 */
export function getBodyContentId(tab: Tableau): string | null {
  if (tab.body) return tab.body;
  if (tab.kind === "saturn_focus") return "saturn";
  if (tab.kind === "finale") return "grand_finale";
  return null;
}

/**
 * JUMP-TO label to tableau id mapping. Each label resolves to a single tableau
 * (no peak-cycling). For SATURN we pick the arrival; for moon labels we pick
 * the corresponding moon tableau.
 */
export const JUMP_TO_TABLEAU: Record<string, string> = {
  SATURN: "saturn_arrival",
  TITAN: "titan_huygens",
  IAPETUS: "iapetus",
  ENCELADUS: "enceladus",
  MIMAS: "mimas",
  TETHYS: "tethys",
  RHEA: "rhea",
  DIONE: "dione",
  FINALE: "grand_finale",
};
