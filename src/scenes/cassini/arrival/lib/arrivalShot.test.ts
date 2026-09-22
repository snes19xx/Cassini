// src/scenes/cassini/arrival/lib/arrivalShot.test.ts
//
// Tests that the approach grows Saturn at a steady rate and opens the rings.

import { describe, expect, it } from "vitest";
import { FULL_MISSION_SECONDS } from "../../data/missionConstants";
import { TABLEAUS } from "../../data/tableaus";
import { missionToDisplay } from "../../lib/tRemap";
import {
  ARRIVAL_ZOOM_MAX,
  ARRIVAL_ZOOM_MIN,
  accumulateArrivalZoom,
  ARRIVAL_POLAR_END_DEG,
  ARRIVAL_POLAR_START_DEG,
  ARRIVAL_RADIUS_END,
  ARRIVAL_RADIUS_START,
  ARRIVAL_ROLL_END_DEG,
  ARRIVAL_TABLEAU_ID,
  ARRIVAL_T_END,
  ARRIVAL_T_START,
  arrivalPolarRad,
  arrivalProgress,
  arrivalRadius,
  arrivalRollDeg,
  ARRIVAL_START_CAMERA_POS,
  isArrivalTableau,
} from "./arrivalShot";

const RING_OUTER = 419.3;

describe("arrival window", () => {
  it("matches the tableau it drives", () => {
    const tab = TABLEAUS.find((t) => t.id === ARRIVAL_TABLEAU_ID);
    expect(tab).toBeDefined();
    expect(tab!.tStart).toBeCloseTo(ARRIVAL_T_START, 6);
    expect(tab!.tEnd).toBeCloseTo(ARRIVAL_T_END, 6);
  });

  it("clamps progress outside the window", () => {
    expect(arrivalProgress(0.0)).toBe(0);
    expect(arrivalProgress(ARRIVAL_T_START)).toBe(0);
    expect(arrivalProgress(ARRIVAL_T_END)).toBe(1);
    expect(arrivalProgress(0.9)).toBe(1);
  });

  it("only claims its own id", () => {
    expect(isArrivalTableau(ARRIVAL_TABLEAU_ID)).toBe(true);
    for (const tab of TABLEAUS) {
      if (tab.id === ARRIVAL_TABLEAU_ID) continue;
      expect(isArrivalTableau(tab.id)).toBe(false);
    }
  });
});

describe("dolly", () => {
  it("spans the intended wall clock at 1x", () => {
    const secs =
      (missionToDisplay(ARRIVAL_T_END) - missionToDisplay(ARRIVAL_T_START)) *
      FULL_MISSION_SECONDS;
    expect(secs).toBeGreaterThan(30);
    expect(secs).toBeLessThan(31.5);
  });

  it("opens on a small but readable Saturn", () => {
    // Saturn's polar radius is 162.3, camera fov is 45.
    const disc = (162.3 / arrivalRadius(0)) / Math.tan((45 / 2) * (Math.PI / 180));
    expect(disc).toBeGreaterThan(0.02);
    expect(disc).toBeLessThan(0.06);
  });

  it("hits both endpoints", () => {
    expect(arrivalRadius(0)).toBeCloseTo(ARRIVAL_RADIUS_START, 6);
    expect(arrivalRadius(1)).toBeCloseTo(ARRIVAL_RADIUS_END, 6);
  });

  it("closes monotonically", () => {
    let prev = Infinity;
    for (let i = 0; i <= 100; i++) {
      const r = arrivalRadius(i / 100);
      expect(r).toBeLessThan(prev);
      prev = r;
    }
  });

  it("grows apparent size at a constant relative rate", () => {
    const rates: number[] = [];
    for (let i = 0; i < 20; i++) {
      const a = arrivalRadius(i / 20);
      const b = arrivalRadius((i + 1) / 20);
      rates.push(Math.log(a / b));
    }
    const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
    for (const r of rates) expect(r).toBeCloseTo(mean, 9);
  });
});

describe("ring opening", () => {
  it("climbs toward the pole without reaching it", () => {
    const open = (p: number) => 90 - (arrivalPolarRad(p) * 180) / Math.PI;
    expect(open(0)).toBeCloseTo(90 - ARRIVAL_POLAR_START_DEG, 6);
    expect(open(1)).toBeCloseTo(90 - ARRIVAL_POLAR_END_DEG, 6);
    let prev = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const o = open(i / 100);
      expect(o).toBeGreaterThan(prev);
      expect(o).toBeLessThan(90);
      prev = o;
    }
  });

  it("keeps the camera clear of the ring outer radius", () => {
    for (let i = 0; i <= 100; i++) {
      const p = i / 100;
      const horiz = arrivalRadius(p) * Math.sin(arrivalPolarRad(p));
      expect(horiz).toBeGreaterThan(RING_OUTER);
    }
  });
});

describe("roll", () => {
  it("starts flat and lands on Saturn's obliquity", () => {
    expect(arrivalRollDeg(0)).toBe(0);
    expect(arrivalRollDeg(1)).toBeCloseTo(ARRIVAL_ROLL_END_DEG, 6);
  });

  it("is monotonic", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const r = arrivalRollDeg(i / 100);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });
});

describe("camera preset", () => {
  it("is the p=0 pose on the +Z meridian", () => {
    const [x, y, z] = ARRIVAL_START_CAMERA_POS;
    expect(x).toBe(0);
    expect(Math.hypot(x, y, z)).toBeCloseTo(arrivalRadius(0), 6);
    expect(z).toBeGreaterThan(0);
    const polar = Math.acos(y / Math.hypot(x, y, z));
    expect((polar * 180) / Math.PI).toBeCloseTo(ARRIVAL_POLAR_START_DEG, 6);
  });

  it("agrees with the tableau's camera preset", () => {
    const tab = TABLEAUS.find((t) => t.id === ARRIVAL_TABLEAU_ID)!;
    const [x, y, z] = ARRIVAL_START_CAMERA_POS;
    expect(tab.camera.pos[0]).toBeCloseTo(x, 3);
    expect(tab.camera.pos[1]).toBeCloseTo(y, 3);
    expect(tab.camera.pos[2]).toBeCloseTo(z, 3);
  });
});

describe("user zoom offset", () => {
  it("holds steady when OrbitControls returns what we wrote", () => {
    expect(accumulateArrivalZoom(1, 1500, 1500)).toBe(1);
  });

  it("ignores tiny noise over many frames", () => {
    let zoom = 1;
    for (let i = 0; i < 20000; i++) {
      const written = 1500;
      const observed = written * (1 + (i % 2 === 0 ? 1e-7 : -1e-7));
      zoom = accumulateArrivalZoom(zoom, written, observed);
    }
    expect(zoom).toBe(1);
  });

  it("keeps a real scroll's offset", () => {
    let zoom = accumulateArrivalZoom(1, 1500, 1500 * 0.95);
    expect(zoom).toBeCloseTo(0.95, 6);
    // Next frame the driver writes scriptRadius times zoom.
    const written = 1400 * zoom;
    zoom = accumulateArrivalZoom(zoom, written, written);
    expect(zoom).toBeCloseTo(0.95, 6);
  });

  it("clamps in both directions", () => {
    let zoom = 1;
    for (let i = 0; i < 50; i++) zoom = accumulateArrivalZoom(zoom, 1000, 900);
    expect(zoom).toBe(ARRIVAL_ZOOM_MIN);
    for (let i = 0; i < 50; i++) zoom = accumulateArrivalZoom(zoom, 1000, 1100);
    expect(zoom).toBe(ARRIVAL_ZOOM_MAX);
  });

  it("ignores invalid input", () => {
    expect(accumulateArrivalZoom(1.1, 0, 500)).toBe(1.1);
    expect(accumulateArrivalZoom(1.1, 1000, NaN)).toBe(1.1);
  });
});
