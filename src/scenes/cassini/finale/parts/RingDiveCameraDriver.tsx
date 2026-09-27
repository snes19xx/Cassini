// src/scenes/cassini/finale/parts/RingDiveCameraDriver.tsx
//
// Per-frame camera writer for the two orbital finale tableaus. thirdPerson
// sits behind and above Cassini, pitched to keep Saturn's horizon in frame.

import type { FinaleCameraMode } from "@/store/missionStore";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useMissionStore } from "../../../../store/missionStore";
import { isOrbitalTableau } from "../../data/missionConstants";
import { DEFAULT_TABLEAU_FOV, getActiveTableau } from "../../data/tableaus";
import { useTransitionStore } from "../../lib/useTransitionStore";
import { ringDiveStateRef } from "../../Spacecraft";
import { chaseCameraPose } from "../lib/chaseCamera";

const CHASE_FWD_DAMP = 3;
const BLEND_IN_MS = 1500;
// Arriving from THREE CRESCENTS is a long ease out of its telephoto pose.
const ENTRY_BLEND_MS = 2800;
const POV_FORWARD = 2;
const POV_LOOK_FORWARD = 60;
const POV_LOOK_SENS = 0.003; // rad per pixel dragged
const POV_PITCH_LIMIT = 1.35; // rad, short of the pole

const DEFAULT_UP = new THREE.Vector3(0, 1, 0);
const _lookTarget = new THREE.Vector3();
const _povDir = new THREE.Vector3();
const _povRight = new THREE.Vector3();

// Drives the camera outright while an orbital tableau is active and mode
// is thirdPerson; hands off cleanly otherwise.
export function RingDiveCameraDriver() {
  const { camera, controls, gl } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: { target?: THREE.Vector3 } | null;
    gl: THREE.WebGLRenderer;
  };
  const finaleCameraMode = useMissionStore((s) => s.finaleCameraMode);
  const wasActiveRef = useRef(false);
  const savedUpRef = useRef(new THREE.Vector3(0, 1, 0));
  const prevModeRef = useRef<FinaleCameraMode>(finaleCameraMode);
  const userInteractedRef = useRef(false);
  const povYawRef = useRef(0);
  const povPitchRef = useRef(0);
  const povDragRef = useRef<{ x: number; y: number } | null>(null);
  // Damped heading, and its last usable horizontal part.
  const chaseFwdRef = useRef(new THREE.Vector3());
  const chaseLevelRef = useRef(new THREE.Vector3(1, 0, 0));
  // Pose the camera held when this driver took over, eased out of.
  const blendStartMsRef = useRef(-Infinity);
  const blendMsRef = useRef(BLEND_IN_MS);
  const blendFromFovRef = useRef(DEFAULT_TABLEAU_FOV);
  const blendFromPosRef = useRef(new THREE.Vector3());
  const blendFromTargetRef = useRef(new THREE.Vector3());
  const blendFromUpRef = useRef(new THREE.Vector3(0, 1, 0));
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);

  // A mode or tableau change drops the grab-to-take-over state, unless it's
  // just the boundary between the two orbital tableaus.
  useEffect(() => {
    if (
      isOrbitalTableau(tableauId) &&
      prevModeRef.current === finaleCameraMode
    ) {
      return;
    }
    userInteractedRef.current = false;
    povYawRef.current = 0;
    povPitchRef.current = 0;
  }, [finaleCameraMode, tableauId]);

  // thirdPerson lets the user grab OrbitControls and fly off; the driver
  // stays hands-off until the mode or tableau changes again.
  useEffect(() => {
    if (!controls) return;
    const c = controls as {
      addEventListener?: (e: string, h: () => void) => void;
      removeEventListener?: (e: string, h: () => void) => void;
    };
    const onStart = () => {
      userInteractedRef.current = true;
    };
    c.addEventListener?.("start", onStart);
    return () => c.removeEventListener?.("start", onStart);
  }, [controls]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the latest ref
      camera.up.copy(savedUpRef.current);
    };
  }, [camera]);

  // Drag only accumulates yaw/pitch while pov is the live mode.
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

  useFrame((_, delta) => {
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

    // pov always drives (this driver has the drag look-around, not
    // OrbitControls); thirdPerson lets a grab hand off to the user.
    const isPov = finaleCameraMode === "pov";
    const shouldDrive =
      isOrbital &&
      !isWide &&
      !flyingPhase &&
      (isPov || !userInteractedRef.current);

    if (!shouldDrive) {
      if (wasActiveRef.current) camera.up.copy(savedUpRef.current);
      wasActiveRef.current = false;
      return;
    }

    const snapChase = !wasActiveRef.current || modeChanged;
    if (!wasActiveRef.current) savedUpRef.current.copy(camera.up);
    if (snapChase) {
      blendStartMsRef.current = performance.now();
      blendMsRef.current = wasActiveRef.current ? BLEND_IN_MS : ENTRY_BLEND_MS;
      blendFromFovRef.current =
        camera instanceof THREE.PerspectiveCamera
          ? camera.fov
          : DEFAULT_TABLEAU_FOV;
      blendFromPosRef.current.copy(camera.position);
      blendFromUpRef.current.copy(camera.up);
      if (controls?.target) {
        blendFromTargetRef.current.copy(controls.target);
      } else {
        camera.getWorldDirection(blendFromTargetRef.current);
        blendFromTargetRef.current.multiplyScalar(100).add(camera.position);
      }
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
      const chaseFwd = chaseFwdRef.current;
      if (snapChase) {
        chaseFwd.copy(fwd);
      } else {
        const k = 1 - Math.exp(-CHASE_FWD_DAMP * Math.min(delta, 0.1));
        chaseFwd.lerp(fwd, k);
      }
      chaseCameraPose(
        pos,
        chaseFwd,
        t,
        chaseLevelRef.current,
        camera.position,
        camera.up,
      );
      _lookTarget.copy(pos);
    }

    const fov = tableau.camera.fov ?? DEFAULT_TABLEAU_FOV;
    const b =
      (performance.now() - blendStartMsRef.current) / blendMsRef.current;
    const e = b < 1 ? b * b * (3 - 2 * b) : 1;
    if (e < 1) {
      camera.position.lerpVectors(blendFromPosRef.current, camera.position, e);
      _lookTarget.lerpVectors(blendFromTargetRef.current, _lookTarget, e);
      camera.up.lerpVectors(blendFromUpRef.current, camera.up, e);
      if (camera.up.lengthSq() < 1e-6) camera.up.copy(DEFAULT_UP);
      camera.up.normalize();
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(blendFromFovRef.current, fov, e);
    }

    if (controls?.target) controls.target.copy(_lookTarget);
    camera.lookAt(_lookTarget);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
