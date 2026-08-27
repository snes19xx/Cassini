// src/scenes/cassini/parts/TransitionDriver.tsx
//
// Drives the camera fly-through for natural tableau changes (scrubber or
// playback crossing a boundary). Manual changes bump cameraResetNonce and
// snap instantly elsewhere; this driver aborts cleanly if one arrives mid-fly.

import { useMissionStore } from "@/store/missionStore";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { isTerminalTableau } from "../data/missionConstants";
import { DEFAULT_TABLEAU_FOV, getActiveTableau } from "../data/tableaus";
import { cassiniWorldPos } from "../lib/cassiniAnchor";
import {
  easeInOutCubic,
  useTransitionStore,
} from "../lib/useTransitionStore";

const FLY_BASE_MS = 800;
const FLY_MIN_MS = 700;
const FLY_MAX_MS = 2400;

function flyDurationFor(posDist: number, targetDist: number): number {
  const d = Math.max(posDist, targetDist);
  return Math.min(FLY_MAX_MS, Math.max(FLY_MIN_MS, 500 + d * 1.1));
}

// cruise_early and saturn_arrival stage Cassini far apart; flying in world
// space outruns the craft's own damp and reads as a hard cut. This pair
// flies in Cassini-relative space instead, so the craft's repositioning
// becomes background motion.
const RIDE_FLY_MS = 2200;

function isCruiseArrivalPair(a: string, b: string): boolean {
  return (
    (a === "cruise_early" && b === "saturn_arrival") ||
    (a === "saturn_arrival" && b === "cruise_early")
  );
}

const _rideRel = new THREE.Vector3();

export function TransitionDriver() {
  const { camera, controls } = useThree() as any;
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);
  const cameraResetNonce = useMissionStore((s) => s.cameraResetNonce);
  const setPhase = useTransitionStore((s) => s.setPhase);
  const setFly = useTransitionStore((s) => s.setFly);

  const phaseRef = useRef<"idle" | "flying">("idle");
  const startMsRef = useRef(0);
  const durationMsRef = useRef(FLY_BASE_MS);
  const startPosRef = useRef(new THREE.Vector3());
  const endPosRef = useRef(new THREE.Vector3());
  const startTargetRef = useRef(new THREE.Vector3());
  const endTargetRef = useRef(new THREE.Vector3());
  const startFovRef = useRef(DEFAULT_TABLEAU_FOV);
  const endFovRef = useRef(DEFAULT_TABLEAU_FOV);
  const rideRef = useRef(false);
  const rideRelStartRef = useRef(new THREE.Vector3());
  const rideRelEndRef = useRef(new THREE.Vector3());

  const prevTableauIdRef = useRef(tableauId);
  const prevNonceRef = useRef(cameraResetNonce);

  useEffect(() => {
    const prevId = prevTableauIdRef.current;
    const idChanged = tableauId !== prevId;
    const nonceChanged = cameraResetNonce !== prevNonceRef.current;
    prevTableauIdRef.current = tableauId;
    prevNonceRef.current = cameraResetNonce;

    if (!idChanged) return;

    if (nonceChanged) {
      if (phaseRef.current === "flying" && controls) {
        controls.update?.();
        phaseRef.current = "idle";
        setPhase("idle");
        setFly(0, FLY_BASE_MS);
      }
      return;
    }

    const state = useMissionStore.getState();
    const snapFovOnly = () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        const fov =
          getActiveTableau(state.currentT).camera.fov ?? DEFAULT_TABLEAU_FOV;
        if (camera.fov !== fov) {
          camera.fov = fov;
          camera.updateProjectionMatrix();
        }
      }
    };
    if (state.showLabels) {
      snapFovOnly();
      return;
    }
    if (state.currentT < 0.001) {
      snapFovOnly();
      return;
    }
    if (!controls) return;

    if (isTerminalTableau(tableauId)) return;

    const tab = getActiveTableau(state.currentT);
    const [ex, ey, ez] = tab.camera.pos;
    const [lx, ly, lz] = tab.camera.lookAt;

    startPosRef.current.copy(camera.position);
    endPosRef.current.set(ex, ey, ez);
    if (controls.target) {
      startTargetRef.current.copy(controls.target);
    } else {
      startTargetRef.current.set(0, 0, 0);
    }
    endTargetRef.current.set(lx, ly, lz);
    startFovRef.current =
      camera instanceof THREE.PerspectiveCamera
        ? camera.fov
        : DEFAULT_TABLEAU_FOV;
    endFovRef.current = tab.camera.fov ?? DEFAULT_TABLEAU_FOV;
    startMsRef.current = performance.now();
    durationMsRef.current = flyDurationFor(
      startPosRef.current.distanceTo(endPosRef.current),
      startTargetRef.current.distanceTo(endTargetRef.current),
    );

    rideRef.current = isCruiseArrivalPair(prevId, tableauId);
    if (rideRef.current) {
      const off = tab.cassiniOffset ?? [0, 0, 0];
      rideRelStartRef.current.copy(camera.position).sub(cassiniWorldPos);
      rideRelEndRef.current.set(ex - off[0], ey - off[1], ez - off[2]);
      durationMsRef.current = RIDE_FLY_MS;
    }

    if (phaseRef.current !== "flying") {
      phaseRef.current = "flying";
      setPhase("flying");
    }
    setFly(startMsRef.current, durationMsRef.current);
  }, [tableauId, cameraResetNonce, camera, controls, setPhase, setFly]);

  useFrame(() => {
    if (phaseRef.current !== "flying") return;
    if (!controls) return;

    const elapsed = performance.now() - startMsRef.current;
    const tNorm = Math.min(1, Math.max(0, elapsed / durationMsRef.current));
    const e = easeInOutCubic(tNorm);

    if (rideRef.current) {
      camera.position
        .copy(cassiniWorldPos)
        .add(
          _rideRel.lerpVectors(rideRelStartRef.current, rideRelEndRef.current, e),
        );
      if (controls.target) {
        controls.target.lerpVectors(cassiniWorldPos, endTargetRef.current, e);
      }
    } else {
      camera.position.lerpVectors(startPosRef.current, endPosRef.current, e);
      if (controls.target) {
        controls.target.lerpVectors(
          startTargetRef.current,
          endTargetRef.current,
          e,
        );
      }
    }
    camera.lookAt(controls.target ?? endTargetRef.current);
    if (
      camera instanceof THREE.PerspectiveCamera &&
      startFovRef.current !== endFovRef.current
    ) {
      // Lerp in tan(fov/2) space so the zoom rate reads as constant.
      const t0 = Math.tan(THREE.MathUtils.degToRad(startFovRef.current / 2));
      const t1 = Math.tan(THREE.MathUtils.degToRad(endFovRef.current / 2));
      camera.fov = THREE.MathUtils.radToDeg(
        2 * Math.atan(THREE.MathUtils.lerp(t0, t1, e)),
      );
    }
    camera.updateProjectionMatrix();

    if (tNorm >= 1) {
      camera.position.copy(endPosRef.current);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = endFovRef.current;
        camera.updateProjectionMatrix();
      }
      if (controls.target) controls.target.copy(endTargetRef.current);
      controls.update?.();
      phaseRef.current = "idle";
      rideRef.current = false;
      setPhase("idle");
      setFly(0, FLY_BASE_MS);
    }
  });

  return null;
}
