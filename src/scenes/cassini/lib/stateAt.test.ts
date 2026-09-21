import { describe, expect, it } from "vitest";
import { TABLEAUS } from "../data/tableaus";
import { stateAt } from "./stateAt";
import type { StageState } from "./types";

const EPS = 1e-4;

const SAMPLE_TS: number[] = (() => {
  const ts = new Set<number>([0, 0.5, 1]);
  for (const tab of TABLEAUS) {
    for (const edge of [tab.tStart, tab.tEnd]) {
      for (const t of [edge - EPS, edge, edge + EPS]) {
        ts.add(Math.min(1, Math.max(0, t)));
      }
    }
  }
  return [...ts].sort((a, b) => a - b);
})();

function expectFiniteStage(stage: StageState, label: string) {
  expect(stage.visible, `${label}.visible`).toBeTypeOf("boolean");
  for (const key of ["offsetX", "offsetY", "offsetZ", "scale", "opacity"] as const) {
    expect(Number.isFinite(stage[key]), `${label}.${key} finite`).toBe(true);
  }
  expect(stage.opacity, `${label}.opacity`).toBeGreaterThanOrEqual(0);
}

const UNIT_RANGE_EFFECTS = [
  "thrusterBurst",
  "soiBurn",
  "huygensRelease",
  "huygensSignal",
  "disintegration",
  "atmosphericEntry",
  "ringCrossing",
] as const;

describe("stateAt", () => {
  it("returns finite, well-formed state at boundaries and endpoints", () => {
    for (const t of SAMPLE_TS) {
      const s = stateAt(t);
      expect(s, `state at t=${t}`).toBeDefined();
      expectFiniteStage(s.cassini, `t=${t} cassini`);
      expectFiniteStage(s.huygens, `t=${t} huygens`);
      expectFiniteStage(s.mliThermalBlanket, `t=${t} mli`);
      expect(Number.isFinite(s.cameraRadius), `t=${t} cameraRadius`).toBe(true);
      for (const axis of ["x", "y", "z"] as const) {
        expect(
          Number.isFinite(s.orientation[axis]),
          `t=${t} orientation.${axis}`,
        ).toBe(true);
      }
    }
  });

  it("keeps documented effects inside [0, 1]", () => {
    for (const t of SAMPLE_TS) {
      const { effects } = stateAt(t);
      for (const key of UNIT_RANGE_EFFECTS) {
        const v = effects[key];
        expect(Number.isFinite(v), `t=${t} effects.${key} finite`).toBe(true);
        expect(v, `t=${t} effects.${key}`).toBeGreaterThanOrEqual(0);
        expect(v, `t=${t} effects.${key}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps propellant in [0, 1] and monotonically non-increasing", () => {
    let prev = Infinity;
    for (let i = 0; i <= 500; i++) {
      const t = i / 500;
      const p = stateAt(t).effects.propellant;
      expect(p, `t=${t} propellant`).toBeGreaterThanOrEqual(0);
      expect(p, `t=${t} propellant`).toBeLessThanOrEqual(1);
      expect(p, `t=${t} propellant increased`).toBeLessThanOrEqual(prev + 1e-9);
      prev = p;
    }
  });

  it("keeps rtgGlow finite and positive across the mission", () => {
    for (const t of SAMPLE_TS) {
      const g = stateAt(t).effects.rtgGlow;
      expect(Number.isFinite(g), `t=${t} rtgGlow`).toBe(true);
      expect(g, `t=${t} rtgGlow`).toBeGreaterThan(0);
    }
  });
});
