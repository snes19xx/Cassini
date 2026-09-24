// src/scenes/cassini/lib/titanCamera.test.ts
//
// The shoulder rig must reach one tableau only, so the sweep asserts every
// other one resolves to null.

import { describe, expect, it } from "vitest";
import {
  TITAN_ENTRY_MOUNT_T_END,
  TITAN_TABLEAU_ID,
} from "../arrival/lib/arrivalShot";
import { TABLEAUS, getActiveTableau } from "../data/tableaus";
import { FADE_END, SEP_START, TOUCHDOWN } from "./huygensDescent";
import { titanCameraMode } from "./titanCamera";

describe("tableau isolation", () => {
  it("resolves to null everywhere outside titan_huygens", () => {
    for (let i = 0; i <= 2000; i++) {
      const t = i / 2000;
      if (getActiveTableau(t).id === TITAN_TABLEAU_ID) continue;
      for (const override of ["shoulder", "wide", null] as const) {
        expect(
          titanCameraMode(t, override),
          `t=${t.toFixed(4)} in "${getActiveTableau(t).id}" (override=${override})`,
        ).toBeNull();
      }
    }
  });

  it("covers every non-Titan tableau in that sweep", () => {
    const seen = new Set<string>();
    for (let i = 0; i <= 2000; i++) seen.add(getActiveTableau(i / 2000).id);
    for (const tab of TABLEAUS) {
      expect(seen.has(tab.id), `tableau "${tab.id}" never sampled`).toBe(true);
    }
  });

  it("stays null through the entry beat", () => {
    const tab = TABLEAUS.find((x) => x.id === TITAN_TABLEAU_ID)!;
    expect(titanCameraMode(tab.tStart, null)).toBeNull();
    expect(
      titanCameraMode(TITAN_ENTRY_MOUNT_T_END - 1e-6, "shoulder"),
    ).toBeNull();
    expect(titanCameraMode(TITAN_ENTRY_MOUNT_T_END, null)).not.toBeNull();
  });
});

describe("schedule", () => {
  it("is shoulder across the descent and wide either side", () => {
    expect(titanCameraMode(SEP_START - 0.001, null)).toBe("wide");
    expect(titanCameraMode(SEP_START, null)).toBe("shoulder");
    expect(titanCameraMode(TOUCHDOWN, null)).toBe("shoulder");
    expect(titanCameraMode(FADE_END, null)).toBe("shoulder");
    expect(titanCameraMode(FADE_END + 0.001, null)).toBe("wide");
  });

  it("lets the override win in both directions", () => {
    expect(titanCameraMode(TOUCHDOWN, "wide")).toBe("wide");
    expect(titanCameraMode(FADE_END + 0.005, "shoulder")).toBe("shoulder");
  });
});
