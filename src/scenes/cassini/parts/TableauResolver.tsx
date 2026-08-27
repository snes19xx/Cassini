// src/scenes/cassini/parts/TableauResolver.tsx

import { useMissionStore } from "@/store/missionStore";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getActiveTableau, type Tableau } from "../data/tableaus";
import { FinaleStage } from "../finale/FinaleStage";
import { SaturnGroup } from "./SaturnGroup";
import { TableauMoonRenderer } from "./TableauMoonRenderer";

export function useActiveTableau(): Tableau {
  return useMissionStore((s) => getActiveTableau(s.currentT));
}

export function useActiveTableauId(): string {
  return useMissionStore((s) => getActiveTableau(s.currentT).id);
}

const NO_ROT: [number, number, number] = [0, 0, 0];

function targetSaturnTransform(t: number): {
  pos: THREE.Vector3;
  scale: number;
  visible: boolean;
  /** Group orientation, XYZ euler DEGREES (saturnBackdrop.rotDeg). */
  rotDeg: [number, number, number];
} {
  const tab = getActiveTableau(t);

  if (tab.kind === "saturn_focus" || tab.kind === "finale") {
    if (tab.id === "saturn_arrival") {
      const span = Math.max(1e-6, tab.tEnd - tab.tStart);
      const p = Math.max(0, Math.min(1, (t - tab.tStart) / span));
      const pEff = Math.min(1, p / 0.55);
      const eased = pEff * pEff * (3 - 2 * pEff);
      return {
        pos: new THREE.Vector3(0, 0, 0),
        scale: eased,
        visible: true,
        rotDeg: NO_ROT,
      };
    }
    return {
      pos: new THREE.Vector3(0, 0, 0),
      scale: 1,
      visible: true,
      rotDeg: NO_ROT,
    };
  }

  if (tab.kind === "moon" && tab.saturnBackdrop) {
    const [px, py, pz] = tab.saturnBackdrop.pos;
    return {
      pos: new THREE.Vector3(px, py, pz),
      scale: tab.saturnBackdrop.scale,
      visible: true,
      rotDeg: tab.saturnBackdrop.rotDeg ?? NO_ROT,
    };
  }

  // cruise / moon without backdrop: Saturn hidden.
  return {
    pos: new THREE.Vector3(-9999, 0, 0),
    scale: 0,
    visible: false,
    rotDeg: NO_ROT,
  };
}

function GlobalSaturn({ renderMode }: { renderMode: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const liveScaleRef = useRef(0);
  const liveVisible = useRef(false);
  const lastTabIdRef = useRef<string | null>(null);
  const tabEnterAtMsRef = useRef(0);
  const cameraResetNonce = useMissionStore((s) => s.cameraResetNonce);
  const lastNonceRef = useRef(cameraResetNonce);

  useFrame((_, deltaRaw) => {
    if (!groupRef.current) return;
    const delta = Number.isFinite(deltaRaw)
      ? Math.min(0.1, Math.max(0, deltaRaw))
      : 0;
    try {
      const t = useMissionStore.getState().currentT;
      const target = targetSaturnTransform(t);
      const tab = getActiveTableau(t);
      const tabChanged = lastTabIdRef.current !== tab.id;
      if (tabChanged) {
        lastTabIdRef.current = tab.id;
        // Only arm the hide-gate if the position actually moved.
        const posSnapped =
          groupRef.current.position.distanceToSquared(target.pos) > 1e-6;
        if (posSnapped) {
          tabEnterAtMsRef.current = performance.now();
        }
        groupRef.current.position.copy(target.pos);
        // Orientation snaps with position, never damped.
        groupRef.current.rotation.set(
          (target.rotDeg[0] * Math.PI) / 180,
          (target.rotDeg[1] * Math.PI) / 180,
          (target.rotDeg[2] * Math.PI) / 180,
        );

        if (!target.visible) {
          liveScaleRef.current = 0;
        }
      }
      // Detect JUMP-TO / RESET (instant-snap path)
      const nonceChanged = lastNonceRef.current !== cameraResetNonce;
      if (nonceChanged) {
        lastNonceRef.current = cameraResetNonce;
        groupRef.current.position.copy(target.pos);
        groupRef.current.rotation.set(
          (target.rotDeg[0] * Math.PI) / 180,
          (target.rotDeg[1] * Math.PI) / 180,
          (target.rotDeg[2] * Math.PI) / 180,
        );
        // Push the enter timestamp back so the gate below is satisfied
        // immediately.
        tabEnterAtMsRef.current = 0;
      }

      // for the first ~100 ms after a natural tableau
      // change, hold scale at 0 so the just-snapped position can't peek
      // through the curtain's ramp-up. JUMP-TO skips this (nonceChanged
      // above resets tabEnterAtMsRef to 0 so sinceEnter is huge).
      const sinceEnterMs = performance.now() - tabEnterAtMsRef.current;
      const dampTarget =
        sinceEnterMs < 100 ? 0 : target.visible ? target.scale : 0;

      liveScaleRef.current = THREE.MathUtils.damp(
        liveScaleRef.current,
        dampTarget,
        // saturn_arrival uses an eased curve
        tab.id === "saturn_arrival" ? 12 : 3.5,
        delta,
      );
      if (!Number.isFinite(liveScaleRef.current)) {
        liveScaleRef.current = target.scale;
      }
      groupRef.current.scale.setScalar(Math.max(0.00001, liveScaleRef.current));
      const shouldShow = target.visible && liveScaleRef.current > 0.001;
      if (shouldShow !== liveVisible.current) {
        liveVisible.current = shouldShow;
        groupRef.current.visible = shouldShow;
      }
    } catch (err) {
      console.error("[GlobalSaturn useFrame] swallowed error", err);
    }
  });

  // Show rings
  const showRings = useMissionStore((s) => {
    const tab = getActiveTableau(s.currentT);
    return tab.effects?.rings !== false;
  });

  return (
    <group ref={groupRef} visible={false}>
      <SaturnGroup renderMode={renderMode} showRings={showRings} />
    </group>
  );
}

export function TableauResolver() {
  const renderMode = useMissionStore((s) => s.renderMode);

  return (
    <>
      <GlobalSaturn renderMode={renderMode} />
      <TableauMoonRenderer renderMode={renderMode} />
      <FinaleStage />
    </>
  );
}
