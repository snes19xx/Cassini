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

const _camPos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function FinalePlungeCamera() {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: { target?: THREE.Vector3 } | null;
  };
  const wasActiveRef = useRef(false);

  useFrame(() => {
    const t = useMissionStore.getState().currentT;
    const tableau = getActiveTableau(t);
    const active = isTerminalTableau(tableau.id);

    if (!active) {
      if (wasActiveRef.current && camera instanceof THREE.PerspectiveCamera) {
        camera.fov = tableau.camera.fov ?? DEFAULT_TABLEAU_FOV;
        camera.updateProjectionMatrix();
      }
      wasActiveRef.current = false;
      return;
    }

    wasActiveRef.current = true;

    const cs = useCameraDebugStore.getState();
    _camPos.set(cs.posX, cs.posY, cs.posZ);
    const pitch = THREE.MathUtils.degToRad(cs.pitchDeg);
    const yaw = THREE.MathUtils.degToRad(cs.yawDeg);
    const cp = Math.cos(pitch);
    _dir.set(cp * Math.cos(yaw), Math.sin(pitch), cp * Math.sin(yaw));
    _look.copy(_camPos).addScaledVector(_dir, LOOK_DIST);

    camera.position.copy(_camPos);
    camera.up.set(0, 1, 0);
    if (controls?.target) controls.target.copy(_look);
    camera.lookAt(_look);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = cs.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
