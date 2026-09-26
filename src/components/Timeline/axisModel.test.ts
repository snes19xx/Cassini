// Invariants for the compressed axis. A tableau window moving in
// tableaus.ts shows up here as a gap, an overlap, or a stray label.

import {
  DATE_ANCHORS,
  formatMissionDate,
} from "@/scenes/cassini/data/missionDates";
import { TABLEAUS } from "@/scenes/cassini/data/tableaus";
import { describe, expect, it } from "vitest";
import { CHAPTERS, STOPS, YEARS, axisT, axisX, stopAt } from "./axisModel";

const SWEEP = Array.from({ length: 401 }, (_, i) => i / 400);

describe("chapters", () => {
  it("tile mission time end to end", () => {
    expect(CHAPTERS[0]!.t0).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1]!.t1).toBe(1);
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i]!.t0).toBe(CHAPTERS[i - 1]!.t1);
    }
  });

  it("tile the axis end to end", () => {
    expect(CHAPTERS[0]!.x0).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1]!.x1).toBeCloseTo(1, 10);
    const shares = CHAPTERS.reduce((sum, c) => sum + c.share, 0);
    expect(shares).toBeCloseTo(1, 10);
  });
});

describe("the warp", () => {
  it("pins both ends", () => {
    expect(axisX(0)).toBe(0);
    expect(axisX(1)).toBeCloseTo(1, 10);
  });

  it("is monotonic", () => {
    let last = -Infinity;
    for (const t of SWEEP) {
      const x = axisX(t);
      expect(x).toBeGreaterThanOrEqual(last);
      last = x;
    }
  });

  it("round-trips", () => {
    for (const t of SWEEP) {
      expect(axisT(axisX(t))).toBeCloseTo(t, 9);
    }
  });

  it("clamps outside [0, 1]", () => {
    expect(axisX(-0.5)).toBe(0);
    expect(axisX(1.5)).toBeCloseTo(1, 10);
    expect(axisT(-0.5)).toBe(0);
    expect(axisT(1.5)).toBeCloseTo(1, 10);
  });
});

describe("destinations", () => {
  it("run in chronological order", () => {
    for (let i = 1; i < STOPS.length; i++) {
      expect(STOPS[i]!.t).toBeGreaterThan(STOPS[i - 1]!.t);
    }
  });

  it("sit on their own tableau's start", () => {
    for (const s of STOPS) {
      const tab = TABLEAUS.find((tb) => tb.id === s.id);
      expect(tab, s.id).toBeDefined();
      expect(s.t).toBe(tab!.tStart);
      expect(s.jumpT).toBeGreaterThanOrEqual(tab!.tStart);
      expect(s.jumpT).toBeLessThan(tab!.tEnd);
    }
  });

  it("sit inside the chapter that brackets them", () => {
    for (const s of STOPS) {
      if (!s.bracket) continue;
      const chapter = CHAPTERS.find((c) => c.id === s.bracket);
      expect(chapter, s.bracket).toBeDefined();
      expect(s.t).toBeGreaterThanOrEqual(chapter!.t0);
      expect(s.t).toBeLessThan(chapter!.t1);
    }
  });

  it("resolve the active one from t", () => {
    expect(stopAt(0)).toBeNull();
    expect(stopAt(0.2)!.label).toBe("SATURN");
    expect(stopAt(0.5)!.label).toBe("IAPETUS");
    expect(stopAt(1)!.label).toBe("FINAL PLUNGE");
  });
});

describe("dates", () => {
  it("drop the day where a tableau spans years", () => {
    expect(formatMissionDate(0.81, "family_portrait")).toBe("Jul 2011");
    expect(formatMissionDate(0.87, "three_crescents")).toBe("Mar 2015");
    expect(formatMissionDate(0.81)).toBe("Jul 29, 2011");
  });

  it("anchor on tableau boundaries", () => {
    const bounds = new Set(TABLEAUS.flatMap((tb) => [tb.tStart, tb.tEnd]));
    for (let i = 1; i < DATE_ANCHORS.length; i++) {
      const [t, ms] = DATE_ANCHORS[i]!;
      const [tPrev, msPrev] = DATE_ANCHORS[i - 1]!;
      expect(t).toBeGreaterThan(tPrev);
      expect(ms).toBeGreaterThanOrEqual(msPrev);
      // The last tableau ends past 1 to include impact.
      expect(t === 1 || bounds.has(t), String(t)).toBe(true);
    }
  });

  it("run forwards", () => {
    const years = YEARS.map((y) => y.t);
    for (let i = 1; i < years.length; i++) {
      expect(years[i]!).toBeGreaterThan(years[i - 1]!);
    }
    expect(years[0]!).toBeGreaterThan(0);
    expect(years[years.length - 1]!).toBeLessThan(1);
  });
});
