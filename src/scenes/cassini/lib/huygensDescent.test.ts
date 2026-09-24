// src/scenes/cassini/lib/huygensDescent.test.ts
//
// Pins the endpoints and the close, which the shoulder camera aims at.

import { describe, expect, it } from "vitest";
import { TABLEAUS } from "../data/tableaus";
import {
  FADE_END,
  SEP_START,
  TOUCHDOWN,
  getHuygensPos,
  isDescending,
} from "./huygensDescent";

const TITAN = TABLEAUS.find((t) => t.id === "titan_huygens")!;
const START = TITAN.cassiniOffset as [number, number, number];

const at = (t: number) => getHuygensPos(t, START, { x: 0, y: 0, z: 0 });
const len = (v: { x: number; y: number; z: number }) =>
  Math.hypot(v.x, v.y, v.z);

describe("descent window", () => {
  it("sits inside the titan_huygens tableau", () => {
    expect(SEP_START).toBeGreaterThanOrEqual(TITAN.tStart);
    expect(FADE_END).toBeLessThan(TITAN.tEnd);
  });

  it("gates isDescending to the window", () => {
    expect(isDescending(SEP_START - 0.001)).toBe(false);
    expect(isDescending(SEP_START)).toBe(true);
    expect(isDescending(TOUCHDOWN)).toBe(true);
    expect(isDescending(FADE_END + 0.001)).toBe(false);
  });
});

describe("getHuygensPos", () => {
  it("starts on Cassini and ends on Titan", () => {
    const start = at(SEP_START);
    expect([start.x, start.y, start.z]).toEqual(START);
    expect(len(at(TOUCHDOWN))).toBeLessThan(1e-9);
  });

  it("holds at the origin through the post-touchdown fade", () => {
    expect(len(at(FADE_END))).toBeLessThan(1e-9);
  });

  it("closes on Titan monotonically once the spring bump has peaked", () => {
    // The spring kick pushes the probe wider early on.
    let prev = Infinity;
    for (let i = 50; i <= 100; i++) {
      const t = SEP_START + ((TOUCHDOWN - SEP_START) * i) / 100;
      const d = len(at(t));
      expect(d, `radius at ${i}% of the fall`).toBeLessThan(prev);
      prev = d;
    }
  });
});
