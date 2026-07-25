// src/scenes/cassini/data/phases.ts
//
// Per-body event content for the InfoPanel + ring-crossing visual cues.
//
// Pre-streamlining this file was a flat 38-entry PHASES array driving the
// scrubber tick marks. The scrubber now uses TABLEAUS as its source of
// truth (10 markers, one per scene); events here are pure InfoPanel
// content keyed by body. See timeline.md for the rationale.

const MISSION_START_MS = new Date("1997-10-15").getTime();
const MISSION_END_MS = new Date("2017-09-15").getTime();
const MISSION_SPAN_MS = MISSION_END_MS - MISSION_START_MS;

export interface BodyEvent {
  /** Pretty-printed for display, e.g. "Mar 8, 2006". */
  date: string;
  /** Local-midnight ms; used for ±90 day "active event" comparisons. */
  dateMs: number;
  /** Short title shown in the panel list. */
  title: string;
}

export interface BodyContent {
  /** Stable id matching tableau.body for moon tableaus, plus "saturn" / "grand_finale". */
  id: string;
  /** All-caps label shown in the panel header. */
  displayName: string;
  /** One-paragraph teaser shown above the event list. */
  hook: string;
  events: BodyEvent[];
}

function ev(y: number, m: number, d: number, title: string): BodyEvent {
  const d0 = new Date(y, m - 1, d);
  return {
    dateMs: d0.getTime(),
    date: d0.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    title,
  };
}

export const BODY_CONTENT: Record<string, BodyContent> = {
  saturn: {
    id: "saturn",
    displayName: "SATURN",
    hook: "Cassini arrived at Saturn in 2004 and orbited for 13 years, mapping the rings, atmosphere, and seasons in unprecedented detail.",
    // Audited vs docs/Timeline_NASA.pdf 2026-07-12 (timeline_analysis.md).
    // The 2004 approach events all fall INSIDE this tableau's date window,
    // so they highlight live during the arrival. The old "Three-moon
    // portrait Sep 2011" entry was a garbled PIA18322 reference (that's
    // Titan/Mimas/Rhea, Mar 2015 — owned by THREE CRESCENTS) and was
    // removed; the hexagon entry moved to FAMILY PORTRAIT, whose window
    // contains its date.
    events: [
      ev(2002, 10, 31, "First long-distance image of Saturn"),
      ev(2004, 4, 7, "Two storms merge — only the second ever observed"),
      ev(2004, 5, 31, "Two new moons discovered — Methone and Pallene"),
      ev(2004, 6, 10, "Phoebe flyby — Cassini's first moon encounter"),
      ev(2004, 6, 30, "Saturn Orbit Insertion — 96-minute retrograde burn"),
      ev(2006, 9, 14, "Faint outer rings discovered edge-on against the sun"),
      ev(2009, 8, 10, "Saturn Equinox — kilometre-long ring shadows"),
      ev(2012, 7, 8, "High-angle ring fine-scale structure"),
      ev(2013, 7, 18, '"Wave at Saturn" — Earth photographed in eclipse'),
    ],
  },

  titan: {
    id: "titan",
    displayName: "TITAN",
    hook: "Titan, Saturn's largest moon and the only one with a substantial atmosphere. Cassini conducted 127 close flybys; Huygens became the first probe to land on a body in the outer Solar System.",
    events: [
      ev(2004, 10, 24, "First close Titan encounter"),
      ev(2004, 12, 23, "Huygens probe separates from orbiter"),
      ev(2005, 1, 14, "Huygens descent & landing — 2h 27m surface data"),
      ev(2006, 7, 21, "Methane/ethane lakes near north pole"),
      ev(2010, 6, 20, "Lowest atmospheric dip — magnetic structure"),
      ev(2014, 3, 5, "100th Titan flyby — methane seas mapped"),
      ev(2016, 4, 28, "Kraken Mare depth & composition revealed"),
    ],
  },

  enceladus: {
    id: "enceladus",
    displayName: "ENCELADUS",
    hook: "A tiny ice moon hiding a global subsurface ocean. Cassini's most astrobiologically significant target.",
    events: [
      ev(2005, 7, 13, "First close Enceladus flyby"),
      ev(2006, 3, 8, "Geyser plumes confirm subsurface liquid water"),
      ev(2007, 10, 9, "Tiger-stripe fractures imaged glowing with activity"),
      ev(2008, 3, 12, "Complex organic molecules detected in plumes"),
      ev(2008, 10, 8, "16-mile flyby — closest of any Cassini target"),
      ev(2008, 12, 14, "South pole confirmed geologically active"),
      ev(2011, 6, 21, "Global subsurface ocean confirmed via gravity"),
      ev(2014, 7, 27, "101 distinct geyser sources mapped"),
      ev(2015, 12, 18, "Final close pass over the plumes"),
    ],
  },

  iapetus: {
    id: "iapetus",
    displayName: "IAPETUS",
    hook: 'Saturn\'s "yin-yang" moon — one hemisphere coated in dark organic material, the other bright ice. The equatorial ridge that makes it look like a walnut is unique in the Solar System.',
    events: [
      ev(2004, 12, 30, "Equatorial ridge + albedo dichotomy revealed"),
      ev(2007, 9, 9, "Close flyby — fine detail on two-toned surface"),
    ],
  },

  mimas: {
    id: "mimas",
    displayName: "MIMAS",
    hook: 'The "Death Star" moon — its 130 km Herschel crater dwarfs the body itself. Cassini\'s later libration analysis hinted at a possible internal ocean.',
    events: [
      ev(2010, 2, 12, "Herschel crater imaged at high resolution"),
      ev(2014, 10, 16, "Libration analysis suggests internal ocean"),
    ],
  },

  tethys: {
    id: "tethys",
    displayName: "TETHYS",
    hook: "An icy moon dominated by the massive Odysseus impact basin and Ithaca Chasma, a 2,000-km rift system that may have formed when Tethys's interior froze and expanded.",
    events: [
      ev(2005, 9, 24, "First close flyby (1,500 km) — Odysseus crater"),
      ev(2007, 8, 14, "Second close pass — high-res Ithaca Chasma"),
      ev(2015, 6, 30, "Final Tethys flyby"),
    ],
  },

  dione: {
    id: "dione",
    displayName: "DIONE",
    hook: 'A heavily cratered moon whose trailing hemisphere shows bright "wispy" terrain — actually ice cliffs from tectonic fracturing.',
    events: [
      ev(2005, 10, 11, "First close Dione flyby"),
      ev(2012, 3, 1, "Molecular oxygen detected in exosphere"),
      ev(2015, 8, 17, "Final close encounter"),
    ],
  },

  rhea: {
    id: "rhea",
    displayName: "RHEA",
    hook: "Saturn's second-largest moon. Cassini detected a tenuous oxygen-carbon-dioxide exosphere — only the second non-Earth body where molecular oxygen was confirmed in situ.",
    events: [
      ev(2005, 11, 26, "First close Rhea flyby"),
      ev(2010, 3, 2, "Closest Rhea pass — 101 km altitude"),
      ev(2010, 11, 28, "Oxygen + CO₂ exosphere announced"),
      ev(2016, 3, 29, "Final visit to the icy moons"),
    ],
  },

  grand_finale: {
    id: "grand_finale",
    displayName: "GRAND FINALE",
    hook: "Cassini's final five months: 22 dives between Saturn and its rings, ending with disintegration in the planet's atmosphere on Sep 15, 2017.",
    events: [
      ev(2016, 11, 29, "F-ring orbits begin"),
      ev(2017, 4, 25, "First ring dive — flash burst"),
      ev(2017, 4, 26, "Grand Finale begins — pitches into Big Empty"),
      ev(2017, 5, 24, "Saturn solstice — maximum axial tilt"),
      ev(2017, 6, 29, "Halfway home — 11th ring dive midpoint"),
      ev(2017, 9, 15, "Disintegration in Saturn's atmosphere"),
    ],
  },
};

const NINETY_DAYS_MS = 90 * 24 * 3600 * 1000;

/** Convert mission t ∈ [0, 1] to wall-clock ms (1997-10-15 → 2017-09-15). */
export function tToDateMs(t: number): number {
  return MISSION_START_MS + Math.max(0, Math.min(1, t)) * MISSION_SPAN_MS;
}

/**
 * Find the event whose date is within ±90 days of `dateMs`. If multiple
 * qualify, returns the closest. Null if none are within the window.
 */
export function findActiveEvent(
  events: BodyEvent[],
  dateMs: number,
): BodyEvent | null {
  let best: BodyEvent | null = null;
  let bestDiff = NINETY_DAYS_MS;
  for (const e of events) {
    const diff = Math.abs(e.dateMs - dateMs);
    if (diff <= bestDiff) {
      best = e;
      bestDiff = diff;
    }
  }
  return best;
}

// 22 ring-crossing flashes during Grand Finale. Used by the visual layer
// (RingCrossingFlash effect), independent of the InfoPanel event list.
export const RING_CROSSING_T_VALUES: number[] = [
  0.980481, 0.981357, 0.982242, 0.983127, 0.984012, 0.9849, 0.98579, 0.986678,
  0.987566, 0.988454, 0.989344, 0.990233, 0.991122, 0.992011, 0.992899,
  0.993788, 0.994677, 0.995565, 0.996453, 0.99734, 0.998228, 0.999115,
];
