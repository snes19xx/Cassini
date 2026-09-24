import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FULL_MISSION_SECONDS } from "../data/missionConstants";
import { TABLEAUS, type Tableau } from "../data/tableaus";
import { missionToDisplay } from "./tRemap";
import {
  TRAVERSE_BASE_MS,
  TRAVERSE_TRAVEL_FACTOR,
  TRAVERSE_TRAVEL_FACTOR_MIN,
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

function shotFor(fromId: string, toId: string, speed = 1) {
  const from = byId(fromId);
  const to = byId(toId);
  return buildTraverse(from, to, presetPos(from), presetTarget(from), speed);
}

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

describe("sampleTraverse", () => {
  const from = byId("enceladus");
  const to = byId("iapetus");
  const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));

  it("lands exactly on the incoming preset", () => {
    const s = sampleTraverse(shot, 1);
    expect(s.pos.distanceTo(presetPos(to))).toBeLessThan(1e-6);
    expect(s.target.distanceTo(presetTarget(to))).toBeLessThan(1e-6);
  });

  it("starts a full travel factor out from the destination", () => {
    const presetDist = presetPos(to).distanceTo(presetTarget(to));
    const startDist = sampleTraverse(shot, 0).pos.distanceTo(presetTarget(to));
    expect(startDist / presetDist).toBeCloseTo(TRAVERSE_TRAVEL_FACTOR, 4);
  });

  it("closes on the destination monotonically", () => {
    for (const [a, b] of chainPairs()) {
      const s = buildTraverse(a, b, presetPos(a), presetTarget(a));
      let prev = Infinity;
      for (let e = 0; e <= 1.0001; e += 0.02) {
        const d = sampleTraverse(s, Math.min(1, e)).pos.distanceTo(
          presetTarget(b),
        );
        expect(d, `${a.id}->${b.id} @${e.toFixed(2)}`).toBeLessThan(prev);
        prev = d;
      }
    }
  });

  it("never puts the camera inside the incoming moon", () => {
    for (const [a, b] of chainPairs()) {
      const s = buildTraverse(a, b, presetPos(a), presetTarget(a));
      for (let e = 0; e <= 1.0001; e += 0.01) {
        const d = sampleTraverse(s, Math.min(1, e)).pos.distanceTo(
          presetTarget(b),
        );
        expect(d, `${a.id}->${b.id} @${e.toFixed(2)}`).toBeGreaterThan(
          b.moonEffectiveRadius! * 1.2,
        );
      }
    }
  });

  it("swings the target from the old moon to the new one", () => {
    expect(
      sampleTraverse(shot, 0).target.distanceTo(shot.startTarget),
    ).toBeLessThan(1e-6);
    expect(
      sampleTraverse(shot, 1).target.distanceTo(shot.endTarget),
    ).toBeLessThan(1e-6);
  });

  it("carries the incoming tableau's fov", () => {
    expect(sampleTraverse(shot, 1).fov).toBe(to.camera.fov ?? 45);
  });
});

// Horizontal half-angle of the 45 deg vertical fov at a wide 21:9 window.
const HALF_FOV_WIDE = Math.atan(Math.tan((45 * Math.PI) / 360) * (21 / 9));

/** Real-time samples over the fly, on the driver's own easeInOutCubic clock. */
function walk(shot: ReturnType<typeof buildTraverse>, n = 400) {
  const out: { e: number; pos: THREE.Vector3; target: THREE.Vector3 }[] = [];
  for (let k = 0; k <= n; k++) {
    const tn = k / n;
    const e = tn < 0.5 ? 4 * tn ** 3 : 1 - (-2 * tn + 2) ** 3 / 2;
    const s = sampleTraverse(shot, e);
    out.push({ e, pos: s.pos.clone(), target: s.target.clone() });
  }
  return out;
}

function offAxisDeg(
  f: { pos: THREE.Vector3; target: THREE.Vector3 },
  p: THREE.Vector3,
): number {
  const view = f.target.clone().sub(f.pos).normalize();
  return (view.angleTo(p.clone().sub(f.pos).normalize()) * 180) / Math.PI;
}

describe("the crossing reads as travel", () => {
  it("never whip-pans", () => {
    for (const [a, b] of chainPairs()) {
      const shot = buildTraverse(a, b, presetPos(a), presetTarget(a));
      const frames = walk(shot);
      const dt = shot.durationMs / 1000 / (frames.length - 1);
      let peak = 0;
      for (let i = 1; i < frames.length; i++) {
        const v0 = frames[i - 1]!.target
          .clone()
          .sub(frames[i - 1]!.pos)
          .normalize();
        const v1 = frames[i]!.target.clone().sub(frames[i]!.pos).normalize();
        peak = Math.max(peak, (v0.angleTo(v1) * 180) / Math.PI / dt);
      }
      expect(peak, `${a.id}->${b.id} deg/s`).toBeLessThan(40);
    }
  });

  it("brings the destination in monotonically", () => {
    for (const [a, b] of chainPairs()) {
      const shot = buildTraverse(a, b, presetPos(a), presetTarget(a));
      let prev = Infinity;
      for (const f of walk(shot)) {
        const ang = offAxisDeg(f, shot.endTarget);
        expect(ang, `${a.id}->${b.id} @${f.e.toFixed(2)}`).toBeLessThan(
          prev + 0.05,
        );
        prev = ang;
      }
    }
  });

  it("keeps the destination inside the frame the whole way", () => {
    for (const [a, b] of chainPairs()) {
      const shot = buildTraverse(a, b, presetPos(a), presetTarget(a));
      for (const f of walk(shot, 60)) {
        expect(
          offAxisDeg(f, shot.endTarget),
          `${a.id}->${b.id} @${f.e.toFixed(2)}`,
        ).toBeLessThan((HALF_FOV_WIDE * 180) / Math.PI);
      }
    }
  });

  it("holds Cassini at a steady seat in frame", () => {
    for (const [a, b] of chainPairs()) {
      const shot = buildTraverse(a, b, presetPos(a), presetTarget(a));
      const angles = walk(shot, 120).map((f) =>
        offAxisDeg(f, traverseCassiniPos(shot, f.e, new THREE.Vector3())),
      );
      const lo = Math.min(...angles);
      const hi = Math.max(...angles);
      expect(hi, `${a.id}->${b.id} max off-axis`).toBeLessThan(20);
      expect(hi - lo, `${a.id}->${b.id} drift`).toBeLessThan(4);

      const ends = [angles[0]!, angles[angles.length - 1]!];
      expect(lo, `${a.id}->${b.id} undershoot`).toBeGreaterThan(
        Math.min(...ends) - 1,
      );
      expect(hi, `${a.id}->${b.id} overshoot`).toBeLessThan(
        Math.max(...ends) + 1,
      );
    }
  });

  // A weave shows up in the second difference of the seat angle.
  it("moves Cassini smoothly frame to frame", () => {
    for (const [a, b] of chainPairs()) {
      const shot = buildTraverse(a, b, presetPos(a), presetTarget(a));
      const ang = walk(shot, 132).map((f) =>
        offAxisDeg(f, traverseCassiniPos(shot, f.e, new THREE.Vector3())),
      );
      let worst = 0;
      for (let i = 2; i < ang.length; i++) {
        worst = Math.max(
          worst,
          Math.abs(ang[i]! - 2 * ang[i - 1]! + ang[i - 2]!),
        );
      }
      expect(worst, `${a.id}->${b.id} deg/frame^2`).toBeLessThan(0.05);
    }
  });
});

describe("traverseMoonState", () => {
  const shot = shotFor("titan_huygens", "enceladus");

  it("holds the incoming moon at full scale from the first frame", () => {
    for (let e = 0; e <= 1.0001; e += 0.05) {
      const st = traverseMoonState(shot, "enceladus", Math.min(1, e))!;
      expect(st.scaleMul).toBe(1);
      expect(st.offset.length()).toBe(0);
    }
  });

  it("holds the departing moon at full scale through the departure", () => {
    for (let e = 0; e <= 0.5; e += 0.05) {
      expect(traverseMoonState(shot, "titan", e)!.scaleMul).toBeCloseTo(1, 6);
    }
  });

  it("fades the departing moon out before the commit", () => {
    expect(traverseMoonState(shot, "titan", 0.95)!.scaleMul).toBeCloseTo(0, 6);
    expect(traverseMoonState(shot, "titan", 1)!.scaleMul).toBeCloseTo(0, 6);
  });

  it("fades monotonically", () => {
    let prev = Infinity;
    for (let e = 0; e <= 1.0001; e += 0.02) {
      const v = traverseMoonState(shot, "titan", Math.min(1, e))!.scaleMul;
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });

  it("only fades the departing moon once it is out of frame", () => {
    for (const [a, b] of chainPairs()) {
      const s = buildTraverse(a, b, presetPos(a), presetTarget(a));
      let fadeStart = 1;
      for (let e = 0; e <= 1.0001; e += 0.01) {
        if (traverseMoonState(s, a.body!, Math.min(1, e))!.scaleMul < 0.999) {
          fadeStart = Math.min(1, e);
          break;
        }
      }
      for (let e = fadeStart; e <= 1.0001; e += 0.01) {
        const sam = sampleTraverse(s, Math.min(1, e));
        const view = sam.target.clone().sub(sam.pos).normalize();
        const toMoon = s.originA.clone().sub(sam.pos);
        const d = toMoon.length();
        const limb =
          view.angleTo(toMoon.normalize()) -
          Math.asin(Math.min(1, a.moonEffectiveRadius! / d));
        expect(limb, `${a.id}->${b.id} @e=${e.toFixed(2)}`).toBeGreaterThan(
          HALF_FOV_WIDE,
        );
      }
    }
  });

  it("leaves unrelated moons to their own damp", () => {
    expect(traverseMoonState(shot, "rhea", 0.5)).toBeNull();
  });
});

describe("traverseSaturn", () => {
  const from = byId("enceladus");
  const to = byId("iapetus");
  const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));

  it("starts on the outgoing backdrop in its translated seat", () => {
    const s = traverseSaturn(shot, 0)!;
    const expected = new THREE.Vector3(...from.saturnBackdrop!.pos).add(
      shot.originA,
    );
    expect(s.pos.distanceTo(expected)).toBeLessThan(1e-6);
    expect(s.scale).toBeCloseTo(from.saturnBackdrop!.scale, 6);
  });

  it("lands on the incoming backdrop exactly", () => {
    const s = traverseSaturn(shot, 1)!;
    expect(
      s.pos.distanceTo(new THREE.Vector3(...to.saturnBackdrop!.pos)),
    ).toBeLessThan(1e-6);
    expect(s.scale).toBeCloseTo(to.saturnBackdrop!.scale, 6);
  });

  it("covers every boundary in the chain", () => {
    for (const [a, b] of chainPairs()) {
      const s = buildTraverse(a, b, presetPos(a), presetTarget(a));
      expect(traverseSaturn(s, 0.5), `${a.id}->${b.id}`).not.toBeNull();
    }
  });
});

describe("traverseCassiniPos", () => {
  const from = byId("dione");
  const to = byId("rhea");
  const shot = buildTraverse(from, to, presetPos(from), presetTarget(from));

  it("leaves the outgoing cassiniOffset in its translated seat", () => {
    const p = traverseCassiniPos(shot, 0, new THREE.Vector3());
    const expected = new THREE.Vector3(...from.cassiniOffset!).add(
      shot.originA,
    );
    expect(p.distanceTo(expected)).toBeLessThan(1e-6);
  });

  it("lands on the incoming cassiniOffset exactly", () => {
    const p = traverseCassiniPos(shot, 1, new THREE.Vector3());
    expect(p.distanceTo(new THREE.Vector3(...to.cassiniOffset!))).toBeLessThan(
      1e-6,
    );
  });

  it("holds the craft in the foreground across the crossing", () => {
    for (const [a, b] of chainPairs()) {
      const s = buildTraverse(a, b, presetPos(a), presetTarget(a));
      for (let e = 0.2; e <= 0.8; e += 0.05) {
        const cam = sampleTraverse(s, e).pos.clone();
        const craft = traverseCassiniPos(s, e, new THREE.Vector3());
        const d = craft.distanceTo(cam);
        expect(d, `${a.id}->${b.id} @${e.toFixed(2)}`).toBeGreaterThan(20);
        expect(d, `${a.id}->${b.id} @${e.toFixed(2)}`).toBeLessThan(400);
      }
    }
  });

  it("moves continuously (no teleport between frames)", () => {
    const step = 1 / 132; // 2.2s at 60fps
    const bound = shot.curve.getLength() / 100;
    let prev = traverseCassiniPos(shot, 0, new THREE.Vector3());
    for (let e = step; e <= 1.0001; e += step) {
      const p = traverseCassiniPos(shot, Math.min(1, e), new THREE.Vector3());
      expect(p.distanceTo(prev), `@${e.toFixed(3)}`).toBeLessThan(bound);
      prev = p;
    }
  });
});

/** Wall-clock seconds the tableau occupies at 1x, straight off the remap. */
function tableauSeconds(tab: Tableau): number {
  return (
    (missionToDisplay(tab.tEnd) - missionToDisplay(tab.tStart)) *
    FULL_MISSION_SECONDS
  );
}

describe("traverse duration", () => {
  it("shrinks with playback speed so it cannot outlast the window", () => {
    expect(shotFor("dione", "rhea", 10).durationMs).toBeLessThan(
      shotFor("dione", "rhea", 1).durationMs,
    );
  });

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
});

describe("corridor shrinks with playback speed", () => {
  const from = byId("dione");
  const to = byId("rhea");

  it("keeps camera speed within 2x across the speed range", () => {
    const rates = ([1, 2, 5, 10] as const).map((s) => {
      const shot = buildTraverse(
        from,
        to,
        presetPos(from),
        presetTarget(from),
        s,
      );
      return shot.curve.getLength() / (shot.durationMs / 1000);
    });
    expect(Math.max(...rates) / Math.min(...rates)).toBeLessThan(2);
  });

  it("shortens the corridor as speed rises", () => {
    expect(shotFor("dione", "rhea", 10).curve.getLength()).toBeLessThan(
      shotFor("dione", "rhea", 1).curve.getLength(),
    );
  });

  it("still travels at least the floor factor at 10x", () => {
    const shot = shotFor("dione", "rhea", 10);
    const presetDist = presetPos(to).distanceTo(presetTarget(to));
    const startDist = sampleTraverse(shot, 0).pos.distanceTo(presetTarget(to));
    expect(startDist / presetDist).toBeGreaterThanOrEqual(
      TRAVERSE_TRAVEL_FACTOR_MIN - 1e-6,
    );
  });

  it("uses the full factor at 1x", () => {
    expect(shotFor("dione", "rhea", 1).durationMs).toBe(TRAVERSE_BASE_MS);
  });
});
