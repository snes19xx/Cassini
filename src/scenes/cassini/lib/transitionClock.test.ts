import * as THREE from "three";
import { beforeEach, describe, expect, it } from "vitest";
import { TABLEAUS, type Tableau } from "../data/tableaus";
import { buildTraverse } from "./traverseShot";
import {
  beginTransitionFrame,
  getFlyProgress,
  getTraverseProgress,
  useTransitionStore,
} from "./useTransitionStore";

const byId = (id: string): Tableau => TABLEAUS.find((t) => t.id === id)!;

function shot() {
  const from = byId("enceladus");
  const to = byId("iapetus");
  return buildTraverse(
    from,
    to,
    new THREE.Vector3(...from.camera.pos),
    new THREE.Vector3(...from.camera.lookAt),
  );
}

/** Burn real wall-clock time, so a second performance.now() would differ. */
function spin(ms: number) {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    /* empty */
  }
}

describe("per-frame transition clock", () => {
  beforeEach(() => {
    useTransitionStore.setState({
      phase: "flying",
      flyStartMs: performance.now() - 500,
      flyDurationMs: 2200,
      traverse: shot(),
    });
  });

  it("returns one sample to everything in a frame", () => {
    beginTransitionFrame();
    const first = getTraverseProgress();
    spin(3);
    const second = getTraverseProgress();
    spin(3);
    const third = getTraverseProgress();

    expect(first).not.toBeNull();
    expect(second!.e).toBe(first!.e);
    expect(third!.e).toBe(first!.e);
    expect(second!.shot).toBe(first!.shot);
  });

  it("keeps the fly clock and the traverse clock on the same value", () => {
    beginTransitionFrame();
    expect(getFlyProgress().e).toBe(getTraverseProgress()!.e);
  });

  it("advances only when a new frame begins", () => {
    beginTransitionFrame();
    const a = getTraverseProgress()!.e;
    spin(20);
    expect(getTraverseProgress()!.e).toBe(a);
    beginTransitionFrame();
    expect(getTraverseProgress()!.e).toBeGreaterThan(a);
  });

  it("clears both clocks when the fly ends", () => {
    beginTransitionFrame();
    expect(getTraverseProgress()).not.toBeNull();
    useTransitionStore.setState({ phase: "idle", traverse: null });
    beginTransitionFrame();
    expect(getTraverseProgress()).toBeNull();
    expect(getFlyProgress().isFly).toBe(false);
  });

  it("reports no traverse for a plain fly but still clocks it", () => {
    useTransitionStore.setState({ traverse: null });
    beginTransitionFrame();
    expect(getTraverseProgress()).toBeNull();
    expect(getFlyProgress().isFly).toBe(true);
    expect(getFlyProgress().e).toBeGreaterThan(0);
  });
});
