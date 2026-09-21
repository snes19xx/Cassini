// REMAP_POINTS needs an anchor wherever a late tableau window starts.

import { describe, expect, it } from "vitest";
import { TABLEAUS } from "../data/tableaus";
import { displayToMission, missionToDisplay, REMAP_POINTS } from "./tRemap";

// SATURN STUDIES starts here.
const ANCHORED_FROM = 0.810;

describe("REMAP_POINTS table", () => {
  it("starts at [0, 0] and ends at [1, 1]", () => {
    expect(REMAP_POINTS[0]).toEqual([0, 0]);
    expect(REMAP_POINTS[REMAP_POINTS.length - 1]).toEqual([1, 1]);
  });

  it("is strictly increasing in BOTH columns (bijection precondition)", () => {
    for (let i = 1; i < REMAP_POINTS.length; i++) {
      const [m0, d0] = REMAP_POINTS[i - 1]!;
      const [m1, d1] = REMAP_POINTS[i]!;
      expect(m1, `mission column at index ${i}`).toBeGreaterThan(m0);
      expect(d1, `display column at index ${i}`).toBeGreaterThan(d0);
    }
  });

  it("has an anchor at EVERY tableau boundary from the late mission on", () => {
    const anchorMissionTs = new Set(REMAP_POINTS.map(([m]) => m));
    for (const tab of TABLEAUS) {
      if (tab.tStart >= ANCHORED_FROM) {
        expect(
          anchorMissionTs.has(tab.tStart),
          `tableau "${tab.id}" starts at ${tab.tStart} with no anchor`,
        ).toBe(true);
      }
    }
    expect(missionToDisplay(1)).toBe(1);
    expect(missionToDisplay(1.0001)).toBe(1);
  });
});

describe("missionToDisplay / displayToMission", () => {
  it("round-trips across a fine sweep of t", () => {
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000;
      const rt = displayToMission(missionToDisplay(t));
      expect(Math.abs(rt - t), `round-trip at t=${t}`).toBeLessThan(1e-9);
    }
  });

  it("round-trips at every anchor exactly", () => {
    for (const [m, d] of REMAP_POINTS) {
      expect(missionToDisplay(m)).toBeCloseTo(d, 12);
      expect(displayToMission(d)).toBeCloseTo(m, 12);
    }
  });

  it("clamps out-of-range input", () => {
    expect(missionToDisplay(-0.5)).toBe(0);
    expect(missionToDisplay(1.5)).toBe(1);
    expect(displayToMission(-0.5)).toBe(0);
    expect(displayToMission(1.5)).toBe(1);
  });

  it("is monotonic (no local reversals a scrubber would feel)", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 2000; i++) {
      const d = missionToDisplay(i / 2000);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });
});
