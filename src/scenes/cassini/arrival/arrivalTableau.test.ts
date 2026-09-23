// src/scenes/cassini/arrival/arrivalTableau.test.ts
//
// Locks the arrival's moon placements and the moon-gate widening it forced on shared code.

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BODY_LABELS } from "../data/bodyLabels";
import { TABLEAUS } from "../data/tableaus";
import {
  ARRIVAL_RADIUS_END,
  ARRIVAL_RADIUS_START,
  ARRIVAL_ROLL_END_DEG,
  ARRIVAL_TABLEAU_ID,
  ARRIVAL_ZOOM_MAX,
  ARRIVAL_ZOOM_MIN,
  arrivalRollRad,
} from "./lib/arrivalShot";

// Scene scale: Saturn's equatorial radius is 180 units.
const KM_PER_UNIT = 60268 / 180;
const SIZE_EXAGGERATION = 8;
const RING_OUTER = 419.3;

// Radii and inclinations are AXIAL.csv (NASA); semi-major axes and periods
// are standard published values.
const MOON_FACTS: Record<
  string,
  { semiMajorKm: number; radiusKm: number; periodHours: number }
> = {
  mimas: { semiMajorKm: 185540, radiusKm: 198.2, periodHours: 22.62 },
  enceladus: { semiMajorKm: 237950, radiusKm: 252.1, periodHours: 32.89 },
  tethys: { semiMajorKm: 294660, radiusKm: 531.1, periodHours: 45.31 },
  dione: { semiMajorKm: 377400, radiusKm: 561.4, periodHours: 65.69 },
  rhea: { semiMajorKm: 527040, radiusKm: 763.5, periodHours: 108.42 },
};

const arrival = TABLEAUS.find((t) => t.id === ARRIVAL_TABLEAU_ID)!;

describe("saturn_arrival composition", () => {
  it("hides Cassini and keeps the SOI burn readout", () => {
    expect(arrival.effects?.hideCassini).toBe(true);
    expect(arrival.effects?.soiBurn).toBe(true);
  });

  it("has no cassiniOffset left over from the chase-cam framing", () => {
    expect(arrival.cassiniOffset).toBeUndefined();
  });

  it("has no jumpT override", () => {
    expect(arrival.jumpT).toBeUndefined();
  });

  it("zoom clamps hold the driver's +/-25% band at both ends", () => {
    expect(arrival.zoom.minDist).toBeLessThanOrEqual(
      ARRIVAL_RADIUS_END * ARRIVAL_ZOOM_MIN,
    );
    expect(arrival.zoom.maxDist).toBeGreaterThanOrEqual(
      ARRIVAL_RADIUS_START * ARRIVAL_ZOOM_MAX,
    );
  });
});

describe("saturn_arrival moons", () => {
  const moons = arrival.moons ?? [];

  it("places the five inner moons", () => {
    expect(moons.map((m) => m.body).sort()).toEqual(
      Object.keys(MOON_FACTS).sort(),
    );
  });

  it("excludes Titan", () => {
    expect(moons.some((m) => m.body === "titan")).toBe(false);
  });

  for (const m of moons) {
    const facts = MOON_FACTS[m.body]!;

    it(`${m.body} sits on its true semi-major axis`, () => {
      const expected = facts.semiMajorKm / KM_PER_UNIT;
      const actual = Math.hypot(m.pos[0], m.pos[1], m.pos[2]);
      expect(Math.abs(actual - expected) / expected).toBeLessThan(0.005);
    });

    it(`${m.body} is seated in the unrolled equatorial plane`, () => {
      // Renderer applies the Z roll per frame; y must be zero here.
      expect(m.pos[1]).toBe(0);
    });

    it(`${m.body} orbits clear of the A ring`, () => {
      expect(Math.hypot(m.pos[0], m.pos[1], m.pos[2])).toBeGreaterThan(
        RING_OUTER,
      );
    });

    it(`${m.body} renders at ${SIZE_EXAGGERATION}x true radius`, () => {
      const expected = (facts.radiusKm / KM_PER_UNIT) * SIZE_EXAGGERATION;
      expect(m.effectiveRadius).toBeCloseTo(expected, 1);
    });

    it(`${m.body} carries its real rotation period`, () => {
      expect(m.spinPeriodHours).toBeCloseTo(facts.periodHours, 1);
    });

    it(`${m.body} can be labelled`, () => {
      expect(BODY_LABELS.some((b) => b.bodyId === m.body)).toBe(true);
    });
  }

  it("drifts at true relative rates", () => {
    // Drift magnitude is stylized; the ratios between moons are real.
    const products = moons.map(
      (m) => (m.orbitRadPerSec ?? 0) * MOON_FACTS[m.body]!.periodHours,
    );
    const mean = products.reduce((s, v) => s + v, 0) / products.length;
    for (const p of products) {
      expect(Math.abs(p - mean) / mean).toBeLessThan(0.01);
    }
  });
});

describe("shared-code widenings stay narrow", () => {
  it("only moon tableaus and the arrival place moons", () => {
    // Projector and resolveMoonTarget both gate moons on kind "moon" or the arrival.
    for (const tab of TABLEAUS) {
      if (!tab.moons) continue;
      expect(
        tab.kind === "moon" || tab.id === ARRIVAL_TABLEAU_ID,
        `${tab.id} carries moons but is kind "${tab.kind}"`,
      ).toBe(true);
    }
  });

  it("leaves every other tableau's rings alone", () => {
    for (const tab of TABLEAUS) {
      if (tab.id === ARRIVAL_TABLEAU_ID) continue;
      expect(tab.effects?.rings).not.toBe(false);
    }
  });
});

describe("ring plane roll", () => {
  // Three's default XYZ Euler order applies Z before X, collapsing the roll into a spin about the ring normal.
  function normalAfterRoll(rollRad: number): THREE.Vector3 {
    const outer = new THREE.Object3D();
    outer.rotation.z = rollRad;
    const inner = new THREE.Object3D();
    inner.rotation.x = Math.PI / 2;
    outer.add(inner);
    outer.updateMatrixWorld(true);
    return new THREE.Vector3(0, 0, 1).applyMatrix4(
      new THREE.Matrix4().extractRotation(inner.matrixWorld),
    );
  }

  const tiltDeg = (n: THREE.Vector3) =>
    THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(n.y))));

  it("is flat at the start of the shot", () => {
    expect(tiltDeg(normalAfterRoll(arrivalRollRad(0)))).toBeCloseTo(0, 6);
  });

  it("reaches the full roll by the end", () => {
    expect(tiltDeg(normalAfterRoll(arrivalRollRad(1)))).toBeCloseTo(
      ARRIVAL_ROLL_END_DEG,
      6,
    );
  });

  it("would be a no-op if collapsed into a single Euler", () => {
    const collapsed = new THREE.Vector3(0, 0, 1).applyEuler(
      new THREE.Euler(Math.PI / 2, 0, arrivalRollRad(1)),
    );
    expect(tiltDeg(collapsed)).toBeCloseTo(0, 6);
  });
});
