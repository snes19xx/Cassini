// src/scenes/cassini/finale/parts/FinalePlungeCamera.tsx
//
// Locked cinematic camera for the terminal plunge. Same pose for the whole
// phase, dialled live via the camera debug store.

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useMissionStore } from "../../../../store/missionStore";
import { DEFAULT_TABLEAU_FOV, getActiveTableau } from "../../data/tableaus";
import { useCameraDebugStore } from "../lib/cameraDebug";
import { isTerminalTableau } from "../lib/finaleDescent";

// Distance to the derived look target. Only direction matters for framing.
const LOOK_DIST = 800;
const DEFAULT_FOV = 45;

const _camPos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function FinalePlungeCamera() {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: { target?: THREE.Vector3 } | null;
  };
  const wasActiveRef = useRef(false);
  // Glides into the locked camera over ~0.4s, seeded from the live camera.
  const dampPosRef = useRef(new THREE.Vector3());
  const dampLookRef = useRef(new THREE.Vector3());
  const dampFovRef = useRef(DEFAULT_FOV);
  const lastNonceRef = useRef(useMissionStore.getState().cameraResetNonce);
  const snapNextRef = useRef(false);

  useFrame((_, delta) => {
    const t = useMissionStore.getState().currentT;
    const tableau = getActiveTableau(t);
    const active = isTerminalTableau(tableau.id);

    const nonce = useMissionStore.getState().cameraResetNonce;
    if (nonce !== lastNonceRef.current) {
      lastNonceRef.current = nonce;
      snapNextRef.current = true;
    }

    if (!active) {
      if (wasActiveRef.current) {
        camera.up.set(0, 1, 0);
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = tableau.camera.fov ?? DEFAULT_TABLEAU_FOV;
          camera.updateProjectionMatrix();
        }
      }
      wasActiveRef.current = false;
      snapNextRef.current = false;
      return;
    }

    const justActivated = !wasActiveRef.current;
    wasActiveRef.current = true;

    const cs = useCameraDebugStore.getState();
    _camPos.set(cs.posX, cs.posY, cs.posZ);
    const pitch = THREE.MathUtils.degToRad(cs.pitchDeg);
    const yaw = THREE.MathUtils.degToRad(cs.yawDeg);
    const cp = Math.cos(pitch);
    _dir.set(cp * Math.cos(yaw), Math.sin(pitch), cp * Math.sin(yaw));
    _look.copy(_camPos).addScaledVector(_dir, LOOK_DIST);
    const targetFov = cs.fov;

    const dt = Math.min(0.05, Math.max(0, delta));
    if (justActivated && snapNextRef.current) {
      dampPosRef.current.copy(_camPos);
      dampLookRef.current.copy(_look);
      dampFovRef.current = targetFov;
    } else if (justActivated) {
      dampPosRef.current.copy(camera.position);
      dampLookRef.current.copy(
        (controls?.target as THREE.Vector3 | undefined) ?? _look,
      );
      dampFovRef.current =
        camera instanceof THREE.PerspectiveCamera ? camera.fov : targetFov;
    }
    snapNextRef.current = false;
    const a = 1 - Math.exp(-4 * dt);
    dampPosRef.current.lerp(_camPos, a);
    dampLookRef.current.lerp(_look, a);
    dampFovRef.current += (targetFov - dampFovRef.current) * a;

    camera.position.copy(dampPosRef.current);
    camera.up.set(0, 1, 0);
    if (controls?.target) controls.target.copy(dampLookRef.current);
    camera.lookAt(dampLookRef.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = dampFovRef.current;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
