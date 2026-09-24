import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FULL_MISSION_SECONDS } from "../data/missionConstants";
import { TABLEAUS, type Tableau } from "../data/tableaus";
import { missionToDisplay } from "./tRemap";
import {
  buildTraverse,
  isTraverseBoundary,
  sampleTraverse,
  traverseCassiniPos,
  traverseMoonState,
  traverseSaturn,
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

function shotFor(fromId: string, toId: string, speed = 1) {
  const from = byId(fromId);
  const to = byId(toId);
  return buildTraverse(from, to, presetPos(from), presetTarget(from), speed);
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

/** Wall-clock seconds the tableau occupies at 1x, straight off the remap. */
function tableauSeconds(tab: Tableau): number {
  return (
    (missionToDisplay(tab.tEnd) - missionToDisplay(tab.tStart)) *
    FULL_MISSION_SECONDS
  );
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

describe("endpoints", () => {
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

  it("lands exactly on the incoming preset", () => {
    for (const [from, to] of chainPairs()) {
      const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));
      const s = sampleTraverse(shot, 1);
      expect(s.pos.distanceTo(presetPos(to)), from.id).toBeLessThan(1e-6);
      expect(s.target.distanceTo(presetTarget(to)), from.id).toBeLessThan(1e-6);
      expect(s.fov).toBe(to.camera.fov ?? 45);
    }
  });

  it("seats the outgoing moon at originA and fades it out by the commit", () => {
    const shot = shotFor("enceladus", "iapetus");
    const seat = traverseMoonState(shot, "enceladus", 0)!;
    expect(seat.offset.distanceTo(shot.originA)).toBeLessThan(1e-6);
    expect(seat.scaleMul).toBeCloseTo(1, 6);
    expect(traverseMoonState(shot, "enceladus", 1)!.scaleMul).toBeCloseTo(0, 6);
    expect(traverseMoonState(shot, "iapetus", 0)!.scaleMul).toBe(1);
    expect(traverseMoonState(shot, "rhea", 0.5)).toBeNull();
  });

  it("moves Saturn between the two backdrop seats", () => {
    const from = byId("enceladus");
    const to = byId("iapetus");
    const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));
    const start = traverseSaturn(shot, 0)!;
    const expected = new THREE.Vector3(...from.saturnBackdrop!.pos).add(
      shot.originA,
    );
    expect(start.pos.distanceTo(expected)).toBeLessThan(1e-6);
    expect(
      traverseSaturn(shot, 1)!.pos.distanceTo(
        new THREE.Vector3(...to.saturnBackdrop!.pos),
      ),
    ).toBeLessThan(1e-6);
  });

  it("leaves Cassini on each tableau's own offset at both ends", () => {
    const from = byId("dione");
    const to = byId("rhea");
    const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));
    const startExpected = new THREE.Vector3(...from.cassiniOffset!).add(
      shot.originA,
    );
    expect(
      traverseCassiniPos(shot, 0, new THREE.Vector3()).distanceTo(
        startExpected,
      ),
    ).toBeLessThan(1e-6);
    expect(
      traverseCassiniPos(shot, 1, new THREE.Vector3()).distanceTo(
        new THREE.Vector3(...to.cassiniOffset!),
      ),
    ).toBeLessThan(1e-6);
  });
});

describe("traverse duration", () => {
  it("never eats more than a third of the incoming window", () => {
    for (const speed of [1, 2, 5, 10] as const) {
      for (const [a, b] of chainPairs()) {
        const shot = buildTraverse(a, b, presetPos(a), presetTarget(a), speed);
        expect(shot.durationMs, `${b.id} @${speed}x`).toBeLessThanOrEqual(
          (tableauSeconds(b) * 1000) / speed / 3 + 1,
        );
      }
    }
  });

  it("still travels at least the floor factor at 10x", () => {
    const to = byId("rhea");
    const shot = shotFor("dione", "rhea", 10);
    const presetDist = presetPos(to).distanceTo(presetTarget(to));
    const startDist = sampleTraverse(shot, 0).pos.distanceTo(presetTarget(to));
    expect(startDist / presetDist).toBeGreaterThanOrEqual(3 - 1e-6);
  });
});
