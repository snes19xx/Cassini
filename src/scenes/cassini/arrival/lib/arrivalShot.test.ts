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
  ARRIVAL_REVEAL_P,
  DEPART_SLEW_END_DEG,
  DEPART_TRUE_ANOMALY_END_DEG,
  TITAN_CAMERA_POS,
  TITAN_ENTRY_START_DIST,
  TITAN_ENTRY_T_END,
  TITAN_TABLEAU_ID,
  arrivalDepartRadius,
  arrivalDepartSlewDeg,
  arrivalDepartTrueAnomaly,
  arrivalDepartureBasis,
  arrivalDepartureState,
  arrivalSwingProgress,
  isArrivalTableau,
  titanEntryProgress,
  titanEntryState,
} from "./arrivalShot";

const RING_OUTER = 419.3;

// Measured through tRemap because mission t and wall-clock seconds are not proportional across this window.
const REVEAL_T =
  ARRIVAL_T_START + (ARRIVAL_T_END - ARRIVAL_T_START) * ARRIVAL_REVEAL_P;
const BEAT_SECONDS =
  (missionToDisplay(ARRIVAL_T_END) - missionToDisplay(REVEAL_T)) *
  FULL_MISSION_SECONDS;

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
    // 30.7s approach + 5.0s fling.
    expect(secs).toBeGreaterThan(35);
    expect(secs).toBeLessThan(36.5);
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

  it("closes monotonically across the approach, then holds", () => {
    let prev = Infinity;
    for (let i = 0; i <= 100; i++) {
      const r = arrivalRadius((i / 100) * ARRIVAL_REVEAL_P);
      expect(r).toBeLessThan(prev);
      prev = r;
    }
    // Camera fling takes over past the reveal point; the dolly holds here.
    expect(arrivalRadius(1)).toBeCloseTo(ARRIVAL_RADIUS_END, 4);
  });

  it("keeps the relative growth rate in a narrow band", () => {
    const rates: number[] = [];
    for (let i = 0; i < 20; i++) {
      const a = arrivalRadius((i / 20) * ARRIVAL_REVEAL_P);
      const b = arrivalRadius(((i + 1) / 20) * ARRIVAL_REVEAL_P);
      rates.push(Math.log(a / b));
    }
    const spread = Math.max(...rates) / Math.min(...rates);
    expect(spread).toBeLessThan(4);
  });
});

describe("ring opening", () => {
  it("climbs toward the pole without reaching it", () => {
    const open = (p: number) => 90 - (arrivalPolarRad(p) * 180) / Math.PI;
    expect(open(0)).toBeCloseTo(90 - ARRIVAL_POLAR_START_DEG, 6);
    expect(open(ARRIVAL_REVEAL_P)).toBeCloseTo(90 - ARRIVAL_POLAR_END_DEG, 6);
    let prev = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const o = open((i / 100) * ARRIVAL_REVEAL_P);
      expect(o).toBeGreaterThan(prev);
      expect(o).toBeLessThan(90);
      prev = o;
    }
  });

  it("keeps the camera clear of the ring outer radius", () => {
    for (let i = 0; i <= 100; i++) {
      const p = (i / 100) * ARRIVAL_REVEAL_P;
      const horiz = arrivalRadius(p) * Math.sin(arrivalPolarRad(p));
      expect(horiz).toBeGreaterThan(RING_OUTER);
    }
  });
});

describe("roll", () => {
  it("starts flat and lands on Saturn's obliquity", () => {
    expect(arrivalRollDeg(0)).toBe(0);
    expect(arrivalRollDeg(ARRIVAL_REVEAL_P)).toBeCloseTo(ARRIVAL_ROLL_END_DEG, 6);
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

describe("dolly curve", () => {
  it("evens out absolute on-screen speed", () => {
    // Balances relative and absolute on-screen speed evenness.
    const disc = (p: number) => 162.3 / arrivalRadius(p);
    const rates: number[] = [];
    for (let i = 0; i < 20; i++) {
      const a = i / 25;
      const b = (i + 1) / 25;
      rates.push((disc(b) - disc(a)) / (b - a));
    }
    const spread = Math.max(...rates) / Math.min(...rates);
    expect(spread).toBeLessThan(7);
  });

  it("still closes monotonically across the approach", () => {
    let prev = Infinity;
    for (let i = 0; i <= 100; i++) {
      const r = arrivalRadius((i / 100) * ARRIVAL_REVEAL_P);
      expect(r).toBeLessThanOrEqual(prev + 1e-9);
      prev = r;
    }
  });
});

// Measures on-screen claims (Saturn exits, Titan enters) against the actual camera frustum.
const FOV_DEG = 45;
const ASPECT = 16 / 9;
const HALF_H_DEG =
  (Math.atan(Math.tan(((FOV_DEG / 2) * Math.PI) / 180) * ASPECT) * 180) /
  Math.PI;
const DEG = Math.PI / 180;

type V3 = [number, number, number];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => {
  const l = len(a);
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Horizontal screen position of `pt` in [-1,1]-ish; sign is the side. */
function screenSide(cam: V3, aim: V3, pt: V3): number {
  const right = unit(cross(aim, [0, 1, 0]));
  const v: V3 = [pt[0] - cam[0], pt[1] - cam[1], pt[2] - cam[2]];
  return dot(unit(v), right);
}
/** Angular radius of a sphere of `radius` seen from `dist`, degrees. */
const angRadius = (radius: number, dist: number) =>
  (Math.atan(radius / dist) * 180) / Math.PI;

describe("departure orbit", () => {
  const AZ = 0.7;

  it("lets the approach finish first", () => {
    expect(arrivalSwingProgress(ARRIVAL_REVEAL_P)).toBe(0);
    expect(arrivalSwingProgress(1)).toBe(1);
  });

  it("runs for the 5.0s the mission budget was extended by", () => {
    // Assert wall clock directly; mission t and seconds are not proportional here.
    expect(BEAT_SECONDS).toBeGreaterThan(4.8);
    expect(BEAT_SECONDS).toBeLessThan(5.2);
    const approach =
      (missionToDisplay(REVEAL_T) - missionToDisplay(ARRIVAL_T_START)) *
      FULL_MISSION_SECONDS;
    expect(approach).toBeGreaterThan(30.4);
    expect(approach).toBeLessThan(31.0);
  });

  it("starts exactly where the approach left the camera", () => {
    const { pos } = arrivalDepartureState(0, AZ);
    expect(len(pos)).toBeCloseTo(ARRIVAL_RADIUS_END, 6);
    const polar = Math.acos(pos[1] / len(pos));
    expect(polar / DEG).toBeCloseTo(ARRIVAL_POLAR_END_DEG, 6);
  });

  it("puts periapsis at the handover with no turnaround", () => {
    expect(arrivalDepartRadius(0)).toBeCloseTo(ARRIVAL_RADIUS_END, 6);
    // Radius only ever grows: past periapsis the craft is climbing away.
    let prev = arrivalDepartRadius(0);
    for (let i = 1; i <= 400; i++) {
      const r = arrivalDepartRadius(i / 400);
      expect(r).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = r;
    }
  });

  it("keeps velocity purely tangential at periapsis", () => {
    const { radial, prograde } = arrivalDepartureBasis(AZ);
    expect(dot(radial, prograde)).toBeCloseTo(0, 12);
    expect(len(radial)).toBeCloseTo(1, 12);
    expect(len(prograde)).toBeCloseTo(1, 12);
  });

  it("sweeps real orbital pacing: fastest at periapsis, slowing on the climb", () => {
    const rate = (u: number) => {
      const d = 1e-4;
      return (
        (arrivalDepartTrueAnomaly(Math.min(1, u + d)) -
          arrivalDepartTrueAnomaly(Math.max(0, u - d))) /
        (Math.min(1, u + d) - Math.max(0, u - d))
      );
    };
    // Kepler's second law: rate falls as the craft climbs.
    expect(rate(0.05)).toBeGreaterThan(rate(0.95) * 2);
    expect(arrivalDepartTrueAnomaly(1) / DEG).toBeCloseTo(
      DEPART_TRUE_ANOMALY_END_DEG,
      4,
    );
  });

  it("never travels in a straight line", () => {
    const a = unit(arrivalDepartureState(0, AZ).pos);
    const b = unit(arrivalDepartureState(1, AZ).pos);
    const swept = Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / DEG;
    expect(swept).toBeGreaterThan(80);
  });

  it("stays close enough that Saturn is still a body, not a dot", () => {
    // The slew, not the dolly, removes Saturn from frame.
    const growth = arrivalDepartRadius(1) / ARRIVAL_RADIUS_END;
    expect(growth).toBeGreaterThan(1.5);
    expect(growth).toBeLessThan(2.5);
    const disc = 180 / arrivalDepartRadius(1) / Math.tan(22.5 * DEG);
    expect(disc).toBeGreaterThan(0.2);
  });

  it("keeps the camera clear of the ring cylinder all the way round", () => {
    for (let a = 0; a < 16; a++) {
      const az = (a / 16) * Math.PI * 2;
      for (let i = 0; i <= 30; i++) {
        expect(len(arrivalDepartureState(i / 30, az).pos)).toBeGreaterThan(
          RING_OUTER + 150,
        );
      }
    }
  });

  it("slews off Saturn monotonically and without whipping", () => {
    expect(arrivalDepartSlewDeg(0)).toBe(0);
    expect(arrivalDepartSlewDeg(1)).toBeCloseTo(DEPART_SLEW_END_DEG, 9);
    let prev = 0;
    let peak = 0;
    const N = 500;
    for (let i = 1; i <= N; i++) {
      const th = arrivalDepartSlewDeg(i / N);
      expect(th).toBeGreaterThanOrEqual(prev - 1e-12);
      peak = Math.max(peak, (th - prev) / (BEAT_SECONDS / N));
      prev = th;
    }
    // Peak angular rate stays well under a whip-pan speed.
    expect(peak).toBeLessThan(25);
  });

  it("empties the frame before the cut, but only just before", () => {
    // Saturn sits at the origin; aim is measured off nadir. Its off-axis angle equals the slew angle.
    const clearedAt = (() => {
      for (let i = 0; i <= 1000; i++) {
        const u = i / 1000;
        const off = arrivalDepartSlewDeg(u);
        if (off - angRadius(RING_OUTER, arrivalDepartRadius(u)) > HALF_H_DEG) {
          return u;
        }
      }
      return null;
    })();
    expect(clearedAt).not.toBeNull();
    const holdSeconds = (1 - clearedAt!) * BEAT_SECONDS;
    // Long enough to cover both snaps; short enough that open sky doesn't read as a hang.
    expect(holdSeconds).toBeGreaterThan(0.3);
    expect(holdSeconds).toBeLessThan(1.2);
    // Saturn stays visible for most of the beat before leaving.
    expect(clearedAt!).toBeGreaterThan(0.7);
  });

  it("holds Saturn in frame for the whole first half", () => {
    for (let i = 0; i <= 50; i++) {
      const u = (i / 50) * 0.5;
      const off = arrivalDepartSlewDeg(u);
      expect(off - angRadius(180, arrivalDepartRadius(u))).toBeLessThan(
        HALF_H_DEG,
      );
    }
  });
});

describe("titan handoff", () => {
  it("matches the tableau it lands on", () => {
    const tab = TABLEAUS.find((t) => t.id === TITAN_TABLEAU_ID);
    expect(tab).toBeDefined();
    expect(tab!.camera.pos).toEqual(TITAN_CAMERA_POS);
    expect(TITAN_ENTRY_START_DIST).toBeLessThanOrEqual(tab!.zoom.maxDist);
  });

  it("covers the front of the Titan window and nothing else", () => {
    expect(TITAN_ENTRY_T_END).toBeGreaterThan(ARRIVAL_T_END);
    const tab = TABLEAUS.find((t) => t.id === TITAN_TABLEAU_ID)!;
    expect(TITAN_ENTRY_T_END).toBeLessThan(tab.tEnd);
    expect(titanEntryProgress(ARRIVAL_T_END)).toBe(0);
    expect(titanEntryProgress(TITAN_ENTRY_T_END)).toBe(1);
    expect(titanEntryProgress(0.9)).toBe(1);
  });

  it("runs about 2.4s at 1x", () => {
    const seconds =
      (missionToDisplay(TITAN_ENTRY_T_END) - missionToDisplay(ARRIVAL_T_END)) *
      FULL_MISSION_SECONDS;
    expect(seconds).toBeGreaterThan(2.0);
    expect(seconds).toBeLessThan(2.8);
  });

  it("lands exactly on the tableau preset", () => {
    const { pos, aim } = titanEntryState(1);
    expect(pos[0]).toBeCloseTo(TITAN_CAMERA_POS[0], 6);
    expect(pos[1]).toBeCloseTo(TITAN_CAMERA_POS[1], 6);
    expect(pos[2]).toBeCloseTo(TITAN_CAMERA_POS[2], 6);
    expect(dot(aim, unit([-pos[0], -pos[1], -pos[2]]))).toBeCloseTo(1, 9);
  });

  it("opens with Titan off frame and closes on it monotonically", () => {
    let prevOff = Infinity;
    let enteredAt: number | null = null;
    const N = 400;
    for (let i = 0; i <= N; i++) {
      const v = i / N;
      const { pos, aim } = titanEntryState(v);
      const toTitan = unit([-pos[0], -pos[1], -pos[2]]);
      const off = Math.acos(Math.max(-1, Math.min(1, dot(aim, toTitan)))) / DEG;
      // Naively slerping aim and position on the same clock sends Titan the wrong way first.
      expect(off).toBeLessThanOrEqual(prevOff + 1e-9);
      prevOff = off;
      if (enteredAt === null && off - angRadius(50, len(pos)) < HALF_H_DEG) {
        enteredAt = v;
      }
    }
    expect(titanEntryState(0)).toBeTruthy();
    const { pos: p0, aim: a0 } = titanEntryState(0);
    const off0 =
      Math.acos(
        Math.max(-1, Math.min(1, dot(a0, unit([-p0[0], -p0[1], -p0[2]])))),
      ) / DEG;
    expect(off0 - angRadius(50, len(p0))).toBeGreaterThan(HALF_H_DEG);
    // The departure's empty hold is still running when this beat starts.
    expect(enteredAt).not.toBeNull();
    expect(enteredAt!).toBeLessThan(0.15);
  });

  it("closes in on Titan by moving the camera", () => {
    let prev = Infinity;
    for (let i = 0; i <= 100; i++) {
      const d = len(titanEntryState(i / 100).pos);
      expect(d).toBeLessThanOrEqual(prev + 1e-9);
      prev = d;
    }
    expect(len(titanEntryState(0).pos)).toBeCloseTo(TITAN_ENTRY_START_DIST, 6);
  });

  it("keeps the camera outside Titan the whole way", () => {
    for (let i = 0; i <= 100; i++) {
      expect(len(titanEntryState(i / 100).pos)).toBeGreaterThan(50 * 1.3);
    }
  });

  it("brings Titan in on the edge Saturn left toward", () => {
    // Saturn exits one side; Titan must enter from the other. Sampled at the
    // last moment Saturn is on screen.
    let saturnSide = 0;
    for (let i = 0; i <= 1000; i++) {
      const u = i / 1000;
      const st = arrivalDepartureState(u, 0.7);
      if (
        arrivalDepartSlewDeg(u) - angRadius(RING_OUTER, st.radius) >
        HALF_H_DEG
      ) {
        break;
      }
      saturnSide = screenSide(st.pos, st.aim, [0, 0, 0]);
    }
    const { pos, aim } = titanEntryState(0);
    const titanSide = screenSide(pos, aim, [0, 0, 0]);
    expect(saturnSide).not.toBe(0);
    expect(Math.sign(titanSide)).toBe(-Math.sign(saturnSide));
  });
});
