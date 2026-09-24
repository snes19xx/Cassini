// DIVES zips RING_CROSSING_T_VALUES against DIVE_META positionally. A length
// change on either side mislabels every tick.

import { tToDateMs } from "@/scenes/cassini/data/missionDates";
import { RING_CROSSING_T_VALUES } from "@/scenes/cassini/data/phases";
import { describe, expect, it } from "vitest";
import { DIVES } from "./diveTable";

const DAY = 86400000;

describe("the dive comb", () => {
  it("has one row per modelled crossing", () => {
    expect(DIVES).toHaveLength(RING_CROSSING_T_VALUES.length);
  });

  it("runs in chronological order on both clocks", () => {
    for (let i = 1; i < DIVES.length; i++) {
      expect(DIVES[i]!.t).toBeGreaterThan(DIVES[i - 1]!.t);
      expect(DIVES[i]!.dateMs).toBeGreaterThan(DIVES[i - 1]!.dateMs);
    }
  });

  it("captions each tick close to where it actually sits", () => {
    // Dates and t drift apart in the terminal tableau; 90 days still
    // catches a row from the wrong month.
    for (const d of DIVES) {
      const drift = Math.abs(d.dateMs - tToDateMs(d.t)) / DAY;
      expect(drift, `${d.date} at t=${d.t}`).toBeLessThan(90);
    }
  });

  it("marks the Final Five and nothing else", () => {
    expect(DIVES.filter((d) => d.isFinalFive)).toHaveLength(5);
    expect(DIVES[0]!.isFinalFive).toBe(false);
  });
});
