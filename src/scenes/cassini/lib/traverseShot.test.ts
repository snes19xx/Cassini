import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { TABLEAUS, type Tableau } from "../data/tableaus";
import {
  buildTraverse,
  isTraverseBoundary,
  sampleTraverse,
  traverseMoonState,
} from "./traverseShot";

function byId(id: string): Tableau {
  const tab = TABLEAUS.find((t) => t.id === id);
  if (!tab) throw new Error(`no tableau ${id}`);
  return tab;
}

function presetPos(tab: Tableau): THREE.Vector3 {
  return new THREE.Vector3(...tab.camera.pos);
}

function presetTarget(tab: Tableau): THREE.Vector3 {
  return new THREE.Vector3(...tab.camera.lookAt);
}

/** Adjacent pairs in timeline order, which is what playback crosses. */
function adjacentPairs(): [Tableau, Tableau][] {
  const pairs: [Tableau, Tableau][] = [];
  for (let i = 1; i < TABLEAUS.length; i++) {
    pairs.push([TABLEAUS[i - 1]!, TABLEAUS[i]!]);
  }
  return pairs;
}

const MOON_CHAIN = [
  "titan_huygens",
  "enceladus",
  "iapetus",
  "mimas",
  "tethys",
  "dione",
  "rhea",
];

function chainPairs(): [Tableau, Tableau][] {
  const pairs: [Tableau, Tableau][] = [];
  for (let i = 1; i < MOON_CHAIN.length; i++) {
    pairs.push([byId(MOON_CHAIN[i - 1]!), byId(MOON_CHAIN[i]!)]);
  }
  return pairs;
}

describe("isTraverseBoundary", () => {
  it("arms on every single-body moon pair in the chain", () => {
    for (let i = 1; i < MOON_CHAIN.length; i++) {
      const prev = MOON_CHAIN[i - 1]!;
      const next = MOON_CHAIN[i]!;
      expect(isTraverseBoundary(prev, next), `${prev} -> ${next}`).toBe(true);
      expect(isTraverseBoundary(next, prev), `${next} -> ${prev}`).toBe(true);
    }
  });

  it.each([
    ["saturn_arrival", "titan_huygens"],
    ["titan_huygens", "saturn_arrival"],
    ["rhea", "family_portrait"],
    ["family_portrait", "rhea"],
    ["family_portrait", "three_crescents"],
    ["three_crescents", "family_portrait"],
    ["three_crescents", "finale_approach"],
    ["cruise_early", "saturn_arrival"],
  ])("stays out of %s -> %s", (prev, next) => {
    expect(isTraverseBoundary(prev, next)).toBe(false);
  });

  it("arms on exactly six of the adjacent pairs walked by playback", () => {
    const armed = adjacentPairs().filter(([a, b]) =>
      isTraverseBoundary(a.id, b.id),
    );
    expect(armed.map(([a, b]) => `${a.id}->${b.id}`)).toEqual([
      "titan_huygens->enceladus",
      "enceladus->iapetus",
      "iapetus->mimas",
      "mimas->tethys",
      "tethys->dione",
      "dione->rhea",
    ]);
  });
});

describe("corridor translation", () => {
  it("preserves the outgoing framing exactly at e=0", () => {
    for (const [from, to] of chainPairs()) {
      const start = presetPos(from);
      const startTarget = presetTarget(from);
      const shot = buildTraverse(from, to, start, startTarget);

      const relBefore = start.clone().sub(startTarget);
      const relAfter = sampleTraverse(shot, 0)
        .pos.clone()
        .sub(shot.startTarget);
      expect(
        relAfter.distanceTo(relBefore),
        `${from.id}->${to.id}`,
      ).toBeLessThan(1e-6);
    }
  });

  it("seats the outgoing moon at originA", () => {
    const from = byId("enceladus");
    const to = byId("iapetus");
    const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));
    const seat = traverseMoonState(shot, "enceladus", 0)!;
    expect(seat.offset.distanceTo(shot.originA)).toBeLessThan(1e-6);
    expect(shot.startTarget.distanceTo(shot.originA)).toBeLessThan(1e-6);
  });

  it("opens a real gap between the two moons", () => {
    for (const [from, to] of chainPairs()) {
      const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));
      const presetDist = presetPos(to).distanceTo(presetTarget(to));
      expect(
        shot.originA.distanceTo(shot.endTarget) / presetDist,
        `${from.id}->${to.id}`,
      ).toBeGreaterThan(5);
    }
  });

  it("passes the departing moon at a safe distance", () => {
    for (const [from, to] of chainPairs()) {
      const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));
      let min = Infinity;
      for (let e = 0; e <= 1.0001; e += 0.005) {
        min = Math.min(
          min,
          sampleTraverse(shot, Math.min(1, e)).pos.distanceTo(shot.originA),
        );
      }
      expect(
        min / from.moonEffectiveRadius!,
        `${from.id}->${to.id}`,
      ).toBeGreaterThan(2.5);
    }
  });
});
