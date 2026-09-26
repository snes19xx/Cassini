import { describe, expect, it } from "vitest";
import { GEO, computeAxisLayout } from "./axisLayout";
import { BRACKETS, STOPS, axisX, bracketMembers } from "./axisModel";

const mono = (label: string, pad: number, px: number) =>
  label.length * px * 0.66 + pad;

const WIDTHS: Record<string, number> = {};
for (const s of STOPS)
  WIDTHS[s.id] = mono(s.label, 8, s.tier === "member" ? 10.5 : 11.5);
for (const b of BRACKETS) WIDTHS[b.id] = mono(b.label, 10, 10);

const members = STOPS.filter((s) => s.tier === "member");

describe("computeAxisLayout", () => {
  it("places every label and bracket", () => {
    const l = computeAxisLayout(1200, WIDTHS);
    for (const s of STOPS) expect(l.slots[s.id], s.id).toBeDefined();
    for (const b of BRACKETS) expect(l.slots[b.id], b.id).toBeDefined();
  });

  it("keeps a single member row when the labels fit", () => {
    const l = computeAxisLayout(1200, WIDTHS);
    expect(l.annH).toBe(GEO.annH);
    for (const s of members) {
      expect(l.slots[s.id]!.bottom).toBe(GEO.memberBottom);
      expect(l.slots[s.id]!.hidden, s.id).toBe(false);
    }
  });

  it("staggers onto a second row when they don't", () => {
    const l = computeAxisLayout(700, WIDTHS);
    expect(l.annH).toBe(GEO.annH + GEO.rowStep);
    const rows = members.map(
      (s) => (l.slots[s.id]!.bottom - GEO.memberBottom) / GEO.rowStep,
    );
    expect(rows).toContain(1);
    expect(rows.filter((r) => r === 0).length).toBeGreaterThan(
      rows.filter((r) => r === 1).length,
    );
  });

  it("keeps every destination down to a usable width", () => {
    for (let width = 1600; width >= 620; width -= 20) {
      const l = computeAxisLayout(width, WIDTHS);
      const dropped = members.filter((s) => l.slots[s.id]!.hidden);
      expect(
        dropped.map((s) => s.label),
        String(width),
      ).toEqual([]);
    }
  });

  it("never overlaps two labels sharing a row", () => {
    for (const width of [1200, 900, 700, 480]) {
      const l = computeAxisLayout(width, WIDTHS);
      const ends: Record<number, number> = {};
      for (const s of members) {
        const slot = l.slots[s.id]!;
        if (slot.hidden) continue;
        const row = (slot.bottom - GEO.memberBottom) / GEO.rowStep;
        const lo = slot.x - WIDTHS[s.id]! / 2;
        expect(lo, `${s.id} @ ${width}`).toBeGreaterThanOrEqual(
          (ends[row] ?? -Infinity) + GEO.memberGap,
        );
        ends[row] = slot.x + WIDTHS[s.id]! / 2;
      }
    }
  });

  it("lifts the chapter row clear of the staggered members", () => {
    const wide = computeAxisLayout(1200, WIDTHS);
    const tight = computeAxisLayout(700, WIDTHS);
    const saturn = STOPS.find((s) => s.label === "SATURN")!.id;
    expect(wide.slots[saturn]!.bottom).toBe(GEO.chapterBottom);
    expect(tight.slots[saturn]!.bottom).toBe(GEO.chapterBottom + GEO.rowStep);
  });

  it("spans each bracket across its own members' marks", () => {
    const width = 1200;
    const l = computeAxisLayout(width, WIDTHS);
    for (const b of BRACKETS) {
      const held = bracketMembers(b.id);
      const a = axisX(held[0]!.t) * width;
      const z = axisX(held[held.length - 1]!.t) * width;
      expect(l.slots[b.id]!.x).toBeCloseTo((a + z) / 2, 10);
      expect(l.slots[b.id]!.stem).toContain(`M ${a} `);
      expect(l.slots[b.id]!.stem).toContain(`L ${z} `);
    }
  });

  it("leaves a stub stem behind a dropped label", () => {
    const l = computeAxisLayout(220, WIDTHS);
    const dropped = STOPS.filter((s) => l.slots[s.id]!.hidden);
    expect(dropped.length).toBeGreaterThan(0);
    for (const s of dropped) {
      const { x } = l.slots[s.id]!;
      expect(l.slots[s.id]!.stem).toBe(`M ${x} ${l.annH - 7} L ${x} ${l.annH}`);
    }
  });

  it("labels a year only where one has room", () => {
    const l = computeAxisLayout(1200, WIDTHS);
    const labelled = l.years.filter((y) => y.labeled);
    expect(labelled.length).toBeGreaterThan(4);
    for (let i = 1; i < labelled.length; i++) {
      expect(labelled[i]!.x - labelled[i - 1]!.x).toBeGreaterThanOrEqual(
        GEO.yearGap,
      );
    }
    for (const y of labelled) {
      expect(y.x).toBeGreaterThanOrEqual(GEO.yearInset);
      expect(y.x).toBeLessThanOrEqual(1200 - GEO.yearInset);
    }
  });
});
