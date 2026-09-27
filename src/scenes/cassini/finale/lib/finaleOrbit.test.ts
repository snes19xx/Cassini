import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { RING_CROSSING_T_VALUES } from "../../data/phases";
import { missionToDisplay } from "../../lib/tRemap";
import {
  APOAPSE,
  CLOUD_TOPS,
  DIVE_T_END,
  ORBITAL_MODEL_SCALE,
  SWING_T_END,
  SWING_T_START,
  finaleOrbitPosition,
} from "./finaleOrbit";

const RING_INNER = 222.5;
const RING_OUTER = 419.3;
// Half the model's ~26-unit span at the orbital scale.
const MODEL_CLEARANCE = 13 * ORBITAL_MODEL_SCALE;
// SceneLighting key light, horizontal.
const SUN = new THREE.Vector3(-400, 0, 200).normalize();

const STEPS = 30000;
const samples = Array.from({ length: STEPS + 1 }, (_, i) => {
  const t = SWING_T_START + ((DIVE_T_END - SWING_T_START) * i) / STEPS;
  return { t, p: finaleOrbitPosition(t, new THREE.Vector3()) };
});
const last = samples[samples.length - 1]!;

function latitudeDeg(p: THREE.Vector3): number {
  return THREE.MathUtils.radToDeg(Math.asin(p.y / p.length()));
}

function nearCrossings(): { t: number; r: number }[] {
  const out: { t: number; r: number }[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    if (Math.sign(a.p.y) === Math.sign(b.p.y)) continue;
    const f = a.p.y / (a.p.y - b.p.y);
    const t = a.t + (b.t - a.t) * f;
    const r = a.p.clone().lerp(b.p, f).length();
    // Apoapse crossings are far out.
    if (r < 2 * RING_OUTER) out.push({ t, r });
  }
  return out;
}

function periapses(): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const r = samples[i]!.p.length();
    if (r < samples[i - 1]!.p.length() && r <= samples[i + 1]!.p.length()) {
      out.push(samples[i]!.p);
    }
  }
  return out;
}

describe("finaleOrbit", () => {
  it("keeps the model above the cloud tops until the final entry", () => {
    const lastPeriapse = periapses().at(-1)!;
    const iLastPeriapse = samples.findIndex(({ p }) => p === lastPeriapse);
    for (const { p } of samples.slice(0, iLastPeriapse + 1)) {
      expect(p.length()).toBeGreaterThan(CLOUD_TOPS + MODEL_CLEARANCE);
    }
    for (const { p } of samples) {
      expect(p.length()).toBeGreaterThan(CLOUD_TOPS - 0.5);
    }
  });

  it("has three periapses: outside the F ring, in the B ring, in the gap", () => {
    const radii = periapses().map((p) => p.length());
    expect(radii).toHaveLength(3);
    expect(radii[0]).toBeGreaterThan(RING_OUTER);
    expect(radii[1]).toBeGreaterThan(RING_INNER);
    expect(radii[1]).toBeLessThan(RING_OUTER);
    expect(radii[2]).toBeLessThan(RING_INNER);
  });

  it("puts every periapse 6 deg S on the dayside", () => {
    for (const p of periapses()) {
      expect(latitudeDeg(p)).toBeCloseTo(-6, 0);
      expect(p.clone().setY(0).normalize().dot(SUN)).toBeGreaterThan(0.95);
    }
  });

  it("ends at the cloud tops at 9.4 deg N on the dayside, descending", () => {
    expect(last.p.length()).toBeCloseTo(CLOUD_TOPS, 0);
    expect(latitudeDeg(last.p)).toBeCloseTo(9.4, 1);
    expect(last.p.clone().normalize().dot(SUN)).toBeGreaterThan(0.9);
    const before = samples[samples.length - 2]!.p.length();
    expect(before).toBeGreaterThan(last.p.length());
  });

  it("stays in a plane 62 deg to the rings", () => {
    const n = new THREE.Vector3()
      .crossVectors(samples[0]!.p, samples[4000]!.p)
      .normalize();
    const incl = THREE.MathUtils.radToDeg(Math.acos(Math.abs(n.y)));
    expect(incl).toBeCloseTo(62, 1);
  });

  it("reaches apoapse at the SWING AROUND boundary", () => {
    const p = finaleOrbitPosition(SWING_T_END, new THREE.Vector3());
    expect(p.length()).toBeCloseTo(APOAPSE, 0);
  });

  it("keeps position and wall-clock speed continuous across the boundary", () => {
    const h = 1e-6;
    const at = (t: number) => finaleOrbitPosition(t, new THREE.Vector3());
    const speed = (t0: number, t1: number) =>
      at(t1).distanceTo(at(t0)) / (missionToDisplay(t1) - missionToDisplay(t0));
    expect(
      at(SWING_T_END - h / 10).distanceTo(at(SWING_T_END + h / 10)),
    ).toBeLessThan(0.1);
    const before = speed(SWING_T_END - 2 * h, SWING_T_END - h);
    const after = speed(SWING_T_END + h, SWING_T_END + 2 * h);
    expect(after / before).toBeCloseTo(1, 2);
  });

  it("never jumps between samples", () => {
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!.p.distanceTo(samples[i - 1]!.p)).toBeLessThan(5);
    }
  });

  it("crosses the ring plane outside the F ring, in the rings, then in the gap", () => {
    const radii = nearCrossings().map((c) => c.r);
    expect(radii).toHaveLength(3);
    expect(radii[0]).toBeGreaterThan(RING_OUTER);
    expect(radii[1]).toBeGreaterThan(RING_INNER);
    expect(radii[1]).toBeLessThan(RING_OUTER);
    expect(radii[2]).toBeLessThan(RING_INNER);
  });

  it("matches the B-ring crossing listed in phases.ts", () => {
    const punch = nearCrossings()[1]!;
    expect(RING_CROSSING_T_VALUES[0]).toBeCloseTo(punch.t, 5);
  });
});
