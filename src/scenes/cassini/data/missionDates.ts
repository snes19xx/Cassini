// src/scenes/cassini/data/missionDates.ts
//
// Mission t -> wall-clock date, shared by the timeline axis and the info panel.

// Every anchor below is a real dated event; t between two of them
// interpolates linearly. Anchors stay sorted and increasing in both columns.

import { TERMINAL_T_START } from "./missionConstants";

export const DATE_ANCHORS: [t: number, ms: number][] = [
  [0, Date.UTC(1997, 9, 15)], // launch, Cape Canaveral
  [0.18, Date.UTC(2004, 6, 1)], // Saturn orbit insertion
  [0.353, Date.UTC(2005, 0, 14)], // Huygens lands on Titan
  [0.42, Date.UTC(2005, 6, 14)], // Enceladus plume flyby
  [0.49, Date.UTC(2007, 8, 10)], // Iapetus at 1,640 km
  [0.58, Date.UTC(2010, 1, 13)], // Mimas: Herschel imaged
  [0.745, Date.UTC(2010, 10, 28)], // Rhea: exosphere announced
  [0.81, Date.UTC(2011, 6, 29)], // five-moon quintet, PIA14573
  [0.87, Date.UTC(2015, 2, 25)], // three crescents, PIA18322
  [0.945, Date.UTC(2017, 3, 26)], // first dive through the gap
  [TERMINAL_T_START, Date.UTC(2017, 8, 15)], // atmospheric entry
  [1, Date.UTC(2017, 8, 15, 11, 55)], // loss of signal
];

// No anchor for Tethys and Dione. They are between Mimas and Rhea with no
// encounter in that stretch.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function tToDateMs(t: number): number {
  const tc = clamp01(t);
  for (let i = 1; i < DATE_ANCHORS.length; i++) {
    const [t0, ms0] = DATE_ANCHORS[i - 1]!;
    const [t1, ms1] = DATE_ANCHORS[i]!;
    if (tc <= t1 || i === DATE_ANCHORS.length - 1) {
      return ms0 + ((tc - t0) / (t1 - t0)) * (ms1 - ms0);
    }
  }
  return DATE_ANCHORS[0]![1];
}

export function dateMsToT(ms: number): number {
  for (let i = 1; i < DATE_ANCHORS.length; i++) {
    const [t0, ms0] = DATE_ANCHORS[i - 1]!;
    const [t1, ms1] = DATE_ANCHORS[i]!;
    if (ms <= ms1 || i === DATE_ANCHORS.length - 1) {
      return t0 + ((ms - ms0) / (ms1 - ms0)) * (t1 - t0);
    }
  }
  return 0;
}

// Both of these tableaus span years.
const MONTH_YEAR_TABLEAUS = new Set(["family_portrait", "three_crescents"]);

/** "Jan 14, 2005", or "Jan 2005" inside a tableau that spans years. */
export function formatMissionDate(t: number, tableauId?: string): string {
  const d = new Date(tToDateMs(t));
  const month = tableauId != null && MONTH_YEAR_TABLEAUS.has(tableauId);
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    ...(month ? {} : { day: "numeric" }),
    year: "numeric",
  });
}
