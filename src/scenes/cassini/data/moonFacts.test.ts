// src/scenes/cassini/data/moonFacts.test.ts
//
// A labelled body with no MOON_FACTS entry renders an empty panel on click.

import { describe, expect, it } from "vitest";
import { getMoonFact, moonLabelledIn } from "./moonFacts";
import { BODY_LABELS } from "./bodyLabels";
import { TABLEAUS } from "./tableaus";

describe("MOON_FACTS coverage", () => {
  it("has an entry for every labelled body", () => {
    for (const body of BODY_LABELS) {
      expect(getMoonFact(body.bodyId), body.bodyId).not.toBeNull();
    }
  });

  it("labels and describes every moon a tableau places", () => {
    const labelled = new Set(BODY_LABELS.map((b) => b.bodyId));
    for (const tab of TABLEAUS) {
      for (const moon of tab.moons ?? []) {
        expect(labelled.has(moon.body), `${tab.id}/${moon.body}`).toBe(true);
      }
      if (tab.kind === "moon" && tab.body) {
        expect(getMoonFact(tab.body), tab.id).not.toBeNull();
      }
    }
  });
});

describe("moonLabelledIn", () => {
  const byId = (id: string) => TABLEAUS.find((t) => t.id === id)!;

  it("matches a single-moon tableau's focal body", () => {
    expect(moonLabelledIn(byId("iapetus"), "iapetus")).toBe(true);
    expect(moonLabelledIn(byId("iapetus"), "titan")).toBe(false);
  });

  it("matches any body a moons array places", () => {
    expect(moonLabelledIn(byId("three_crescents"), "titan")).toBe(true);
    expect(moonLabelledIn(byId("three_crescents"), "janus")).toBe(false);
    expect(moonLabelledIn(byId("saturn_arrival"), "dione")).toBe(true);
  });

  it("matches nothing on a tableau with no bodies", () => {
    expect(moonLabelledIn(byId("cruise_early"), "titan")).toBe(false);
  });
});
