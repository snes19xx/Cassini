// src/scenes/cassini/finale/parts/RingDiveCameraDriver.tsx
//
// Per-frame camera writer for the two orbital finale tableaus. thirdPerson
// holds a chase framing outward from Saturn beyond Cassini, looking back.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FinaleCameraMode } from "@/store/missionStore";
import { useMissionStore } from "../../../../store/missionStore";
import { isOrbitalTableau } from "../../data/missionConstants";
import { getActiveTableau } from "../../data/tableaus";
import { useTransitionStore } from "../../lib/useTransitionStore";
import { ringDiveStateRef } from "../../Spacecraft";

// Cassini's model + booms is ~26 units, so a small outward distance puts
// the camera inside the structure.
const CHASE_OUTWARD_DIST = 150;
const CHASE_UP = 55;
const POV_FORWARD = 2;
const POV_LOOK_FORWARD = 60;
const POV_LOOK_SENS = 0.003; // rad per pixel dragged
const POV_PITCH_LIMIT = 1.35; // rad, short of the pole

const DEFAULT_UP = new THREE.Vector3(0, 1, 0);
const _outward = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _povDir = new THREE.Vector3();
const _povRight = new THREE.Vector3();

// Owns the camera outright while an orbital tableau is active and mode is
// thirdPerson; hands off cleanly otherwise.
export function RingDiveCameraDriver() {
  const { camera, controls, gl } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: { target?: THREE.Vector3 } | null;
    gl: THREE.WebGLRenderer;
  };
  const finaleCameraMode = useMissionStore((s) => s.finaleCameraMode);
  const wasActiveRef = useRef(false);
  const prevModeRef = useRef<FinaleCameraMode>(finaleCameraMode);
  const povYawRef = useRef(0);
  const povPitchRef = useRef(0);
  const povDragRef = useRef<{ x: number; y: number } | null>(null);

  // Drag accumulates yaw/pitch only while pov is the live mode, so the
  // listeners stay inert everywhere else without a mount/unmount churn.
  useEffect(() => {
    const el = gl.domElement;
    const povActive = () => {
      const s = useMissionStore.getState();
      return (
        s.finaleCameraMode === "pov" &&
        isOrbitalTableau(getActiveTableau(s.currentT).id)
      );
    };
    const onDown = (e: PointerEvent) => {
      if (!povActive() || e.button !== 0) return;
      povDragRef.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const drag = povDragRef.current;
      if (!drag) return;
      if (!povActive()) {
        povDragRef.current = null;
        return;
      }
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      povYawRef.current += dx * POV_LOOK_SENS;
      povPitchRef.current = THREE.MathUtils.clamp(
        povPitchRef.current + dy * POV_LOOK_SENS,
        -POV_PITCH_LIMIT,
        POV_PITCH_LIMIT,
      );
    };
    const onUp = () => {
      povDragRef.current = null;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [gl]);

  useFrame(() => {
    const t = useMissionStore.getState().currentT;
    const tableau = getActiveTableau(t);
    const isOrbital = isOrbitalTableau(tableau.id);
    const isWide = finaleCameraMode === "wide";
    const flyingPhase = useTransitionStore.getState().phase === "flying";

    // wide is a one-time snap back to the tableau's own preset, then the
    // driver steps aside and OrbitControls takes the frame.
    const modeChanged = prevModeRef.current !== finaleCameraMode;
    prevModeRef.current = finaleCameraMode;
    if (modeChanged && isWide && isOrbital && !flyingPhase) {
      camera.position.set(
        tableau.camera.pos[0],
        tableau.camera.pos[1],
        tableau.camera.pos[2],
      );
      _lookTarget.set(
        tableau.camera.lookAt[0],
        tableau.camera.lookAt[1],
        tableau.camera.lookAt[2],
      );
      camera.up.copy(DEFAULT_UP);
      if (controls?.target) controls.target.copy(_lookTarget);
      camera.lookAt(_lookTarget);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.updateProjectionMatrix();
      }
    }

    const isPov = finaleCameraMode === "pov";
    const shouldDrive =
      isOrbital &&
      !isWide &&
      !flyingPhase &&
      (finaleCameraMode === "thirdPerson" || isPov);

    if (!shouldDrive) {
      if (wasActiveRef.current) camera.up.copy(DEFAULT_UP);
      wasActiveRef.current = false;
      return;
    }

    wasActiveRef.current = true;
    camera.up.copy(DEFAULT_UP);

    const pos = ringDiveStateRef.position;
    const fwd = ringDiveStateRef.velocity;

    if (isPov) {
      camera.position.copy(pos).addScaledVector(fwd, POV_FORWARD);
      _povDir.copy(fwd);
      if (_povDir.lengthSq() < 1e-8) _povDir.set(0, 0, 1);
      _povDir.normalize();
      if (povYawRef.current !== 0) {
        _povDir.applyAxisAngle(DEFAULT_UP, povYawRef.current);
      }
      if (povPitchRef.current !== 0) {
        _povRight.crossVectors(_povDir, DEFAULT_UP);
        if (_povRight.lengthSq() > 1e-8) {
          _povRight.normalize();
          _povDir.applyAxisAngle(_povRight, povPitchRef.current);
        }
      }
      _lookTarget
        .copy(camera.position)
        .addScaledVector(_povDir, POV_LOOK_FORWARD);
    } else {
      _outward.copy(pos);
      const r = _outward.length();
      if (r < 1e-3) _outward.set(1, 0, 0);
      else _outward.multiplyScalar(1 / r);

      camera.position
        .copy(pos)
        .addScaledVector(_outward, CHASE_OUTWARD_DIST)
        .addScaledVector(DEFAULT_UP, CHASE_UP);
      _lookTarget.set(0, 0, 0);
    }

    if (controls?.target) controls.target.copy(_lookTarget);
    camera.lookAt(_lookTarget);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
