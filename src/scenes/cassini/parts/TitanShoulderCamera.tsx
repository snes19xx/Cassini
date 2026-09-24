// src/scenes/cassini/parts/TitanShoulderCamera.tsx
//
// Over-the-shoulder camera for the Huygens landing, parked behind and above
// Cassini with the aim damped onto the falling probe.

import { useMissionStore } from "@/store/missionStore";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getActiveTableau } from "../data/tableaus";
import { cassiniWorldPos } from "../lib/cassiniAnchor";
import { getHuygensPos } from "../lib/huygensDescent";
import { titanCameraMode } from "../lib/titanCamera";
import { useTransitionStore } from "../lib/useTransitionStore";

const SHOULDER_BACK = 26;
const SHOULDER_RISE = 7;
const SHOULDER_SIDE = 9;

// Damp rate for position and aim, slow enough to read as a camera move.
const RIG_LAMBDA = 3.2;

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const _probe = new THREE.Vector3();
const _toTitan = new THREE.Vector3();
const _right = new THREE.Vector3();
const _rigUp = new THREE.Vector3();
const _desired = new THREE.Vector3();

/** Drives the camera across the Huygens descent window in titan_huygens. */
export function TitanShoulderCamera() {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: { target?: THREE.Vector3 } | null;
  };
  const aimRef = useRef(new THREE.Vector3());
  const wasDrivingRef = useRef(false);

  useFrame((_, deltaRaw) => {
    // Backgrounded tabs deliver multi-second deltas, which damp() turns into
    // NaN positions.
    const delta = Number.isFinite(deltaRaw)
      ? Math.min(0.1, Math.max(0, deltaRaw))
      : 0;

    const state = useMissionStore.getState();
    const t = state.currentT;
    const mode = titanCameraMode(t, state.titanCameraOverride);

    // Off Titan, clear the pinned override
    if (mode === null) {
      if (state.titanCameraOverride !== null) {
        state.setTitanCameraOverride(null);
      }
      wasDrivingRef.current = false;
      return;
    }

    // TransitionDriver writes the camera during a boundary fly.
    if (useTransitionStore.getState().phase === "flying") {
      wasDrivingRef.current = false;
      return;
    }

    const tableau = getActiveTableau(t);

    if (mode !== "shoulder") {
      // Hard cut back to the tableau preset on the frame driving stops
      if (wasDrivingRef.current) {
        camera.position.set(
          tableau.camera.pos[0],
          tableau.camera.pos[1],
          tableau.camera.pos[2],
        );
        aimRef.current.set(
          tableau.camera.lookAt[0],
          tableau.camera.lookAt[1],
          tableau.camera.lookAt[2],
        );
        camera.up.copy(WORLD_UP);
        if (controls?.target) controls.target.copy(aimRef.current);
        camera.lookAt(aimRef.current);
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.updateProjectionMatrix();
        }
      }
      wasDrivingRef.current = false;
      return;
    }

    const startOffset = (tableau.cassiniOffset ?? [0, 0, 0]) as [
      number,
      number,
      number,
    ];
    getHuygensPos(t, startOffset, _probe);

    _toTitan.copy(cassiniWorldPos).negate();
    if (_toTitan.lengthSq() < 1e-8) _toTitan.set(0, 0, -1);
    _toTitan.normalize();

    _right.crossVectors(_toTitan, WORLD_UP);
    if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
    _right.normalize();
    _rigUp.crossVectors(_right, _toTitan).normalize();

    _desired
      .copy(cassiniWorldPos)
      .addScaledVector(_toTitan, -SHOULDER_BACK)
      .addScaledVector(_rigUp, SHOULDER_RISE)
      .addScaledVector(_right, SHOULDER_SIDE);

    // First driving frame seeds the aim from the current view.
    if (!wasDrivingRef.current) {
      aimRef.current.copy(
        controls?.target ??
          new THREE.Vector3(
            tableau.camera.lookAt[0],
            tableau.camera.lookAt[1],
            tableau.camera.lookAt[2],
          ),
      );
    }
    wasDrivingRef.current = true;

    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      _desired.x,
      RIG_LAMBDA,
      delta,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      _desired.y,
      RIG_LAMBDA,
      delta,
    );
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      _desired.z,
      RIG_LAMBDA,
      delta,
    );
    if (!Number.isFinite(camera.position.lengthSq())) {
      camera.position.copy(_desired);
    }

    const aim = aimRef.current;
    aim.x = THREE.MathUtils.damp(aim.x, _probe.x, RIG_LAMBDA, delta);
    aim.y = THREE.MathUtils.damp(aim.y, _probe.y, RIG_LAMBDA, delta);
    aim.z = THREE.MathUtils.damp(aim.z, _probe.z, RIG_LAMBDA, delta);
    if (!Number.isFinite(aim.lengthSq())) aim.copy(_probe);

    // Camera and target coinciding causes OrbitControls.update() crash.
    if (camera.position.distanceToSquared(aim) < 1e-6) return;

    camera.up.copy(WORLD_UP);
    if (controls?.target) controls.target.copy(aim);
    camera.lookAt(aim);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
