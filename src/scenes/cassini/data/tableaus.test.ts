import { describe, expect, it } from "vitest";
import { getActiveTableau, TABLEAUS } from "./tableaus";

describe("TABLEAUS windows", () => {
  it("has at least one tableau", () => {
    expect(TABLEAUS.length).toBeGreaterThan(0);
  });

  it("every window has tStart < tEnd", () => {
    for (const tab of TABLEAUS) {
      expect(tab.tStart, tab.id).toBeLessThan(tab.tEnd);
    }
  });

  it("is sorted by tStart", () => {
    for (let i = 1; i < TABLEAUS.length; i++) {
      expect(
        TABLEAUS[i]!.tStart,
        `${TABLEAUS[i]!.id} vs ${TABLEAUS[i - 1]!.id}`,
      ).toBeGreaterThanOrEqual(TABLEAUS[i - 1]!.tStart);
    }
  });

  it("covers [0, 1] with no gaps and no overlaps", () => {
    expect(TABLEAUS[0]!.tStart).toBe(0);
    for (let i = 1; i < TABLEAUS.length; i++) {
      const prev = TABLEAUS[i - 1]!;
      const next = TABLEAUS[i]!;
      // Windows use exclusive end bounds.
      expect(
        next.tStart,
        `gap/overlap between "${prev.id}" (tEnd ${prev.tEnd}) and ` +
          `"${next.id}" (tStart ${next.tStart})`,
      ).toBe(prev.tEnd);
    }
    expect(TABLEAUS[TABLEAUS.length - 1]!.tEnd).toBeGreaterThanOrEqual(1.0);
  });

  it("getActiveTableau returns a real window (never the cruise fallback) across [0, 1]", () => {
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000;
      const tab = getActiveTableau(t);
      expect(t, `t=${t} resolved to "${tab.id}" outside its window`).toBeGreaterThanOrEqual(
        tab.tStart,
      );
      expect(t).toBeLessThan(tab.tEnd);
    }
  });
});

describe("TABLEAUS fields", () => {
  it("every explicit fov is a sane focal length [5, 90]", () => {
    for (const tab of TABLEAUS) {
      if (tab.camera.fov !== undefined) {
        expect(tab.camera.fov, tab.id).toBeGreaterThanOrEqual(5);
        expect(tab.camera.fov, tab.id).toBeLessThanOrEqual(90);
      }
    }
  });

  it("every moons[] composition is non-empty (moons[0] is the hi-res slot)", () => {
    for (const tab of TABLEAUS) {
      if (tab.moons) {
        expect(tab.moons.length, tab.id).toBeGreaterThan(0);
        for (const moon of tab.moons) {
          expect(moon.effectiveRadius, `${tab.id}/${moon.body}`).toBeGreaterThan(0);
          expect(moon.pos, `${tab.id}/${moon.body}`).toHaveLength(3);
        }
      }
    }
  });

  it("zoom clamps are ordered (minDist < maxDist)", () => {
    for (const tab of TABLEAUS) {
      expect(tab.zoom.minDist, tab.id).toBeGreaterThan(0);
      expect(tab.zoom.minDist, tab.id).toBeLessThan(tab.zoom.maxDist);
    }
  });

  it("orbitLimits, when present, are ordered", () => {
    for (const tab of TABLEAUS) {
      if (tab.orbitLimits) {
        expect(tab.orbitLimits.minAzimuth, tab.id).toBeLessThan(
          tab.orbitLimits.maxAzimuth,
        );
        expect(tab.orbitLimits.minPolar, tab.id).toBeLessThan(
          tab.orbitLimits.maxPolar,
        );
      }
    }
  });
});
