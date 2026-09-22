// src/scenes/cassini/arrival/parts/ArrivalCameraDriver.tsx
//
// Per-frame camera writer for the SATURN ORBIT INSERTION dolly. Drives radius
// and polar while the user keeps azimuth and a bounded zoom offset.

import { useMissionStore } from "@/store/missionStore";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getActiveTableau } from "../../data/tableaus";
import { useTransitionStore } from "../../lib/useTransitionStore";
import {
  ARRIVAL_SNAP_RATIO,
  accumulateArrivalZoom,
  arrivalPolarRad,
  arrivalProgress,
  arrivalRadius,
  isArrivalTableau,
} from "../lib/arrivalShot";

// Ease from wherever the ride-along left the camera onto the scripted pose.
const BLEND_MS = 600;

const _offset = new THREE.Vector3();
const _sph = new THREE.Spherical();
const _next = new THREE.Vector3();
const _origin = new THREE.Vector3();

function smoothstep01(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

export function ArrivalCameraDriver() {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: { target?: THREE.Vector3 } | null;
  };

  const armedRef = useRef(false);
  const blendStartRef = useRef(0);
  const blendFromRadiusRef = useRef(0);
  const blendFromPolarRef = useRef(0);
  const lastWrittenRadiusRef = useRef(0);
  const zoomRef = useRef(1);

  useFrame(() => {
    try {
      const t = useMissionStore.getState().currentT;
      const tab = getActiveTableau(t);
      if (!isArrivalTableau(tab.id)) {
        armedRef.current = false;
        return;
      }
      // TransitionDriver's cruise ride-along has the first 2.2s.
      if (useTransitionStore.getState().phase === "flying") {
        armedRef.current = false;
        return;
      }

      const target = controls?.target ?? _origin;
      _offset.copy(camera.position).sub(target);
      if (_offset.lengthSq() < 1e-6) return;
      _sph.setFromVector3(_offset);

      const p = arrivalProgress(t);
      const scriptRadius = arrivalRadius(p);
      const scriptPolar = arrivalPolarRad(p);

      if (!armedRef.current) {
        armedRef.current = true;
        // Cuts when the camera is far from the script (entering from
        // cruise); eases when close (JUMP-TO or resuming after a fly).
        const offBy = Math.max(
          _sph.radius / scriptRadius,
          scriptRadius / _sph.radius,
        );
        const snap = !Number.isFinite(offBy) || offBy < ARRIVAL_SNAP_RATIO;
        blendStartRef.current = snap
          ? performance.now() - BLEND_MS
          : performance.now();
        blendFromRadiusRef.current = _sph.radius;
        blendFromPolarRef.current = _sph.phi;
        zoomRef.current = 1;
      } else {
        zoomRef.current = accumulateArrivalZoom(
          zoomRef.current,
          lastWrittenRadiusRef.current,
          _sph.radius,
        );
      }

      const b = smoothstep01(
        (performance.now() - blendStartRef.current) / BLEND_MS,
      );
      const radius = THREE.MathUtils.lerp(
        blendFromRadiusRef.current,
        scriptRadius * zoomRef.current,
        b,
      );
      const polar = THREE.MathUtils.lerp(
        blendFromPolarRef.current,
        scriptPolar,
        b,
      );
      if (!Number.isFinite(radius) || !Number.isFinite(polar)) return;

      _sph.radius = radius;
      _sph.phi = polar;
      // theta is left as read for user drag and auto-rotate.
      _sph.makeSafe();

      _next.setFromSpherical(_sph).add(target);
      camera.position.copy(_next);
      camera.lookAt(target);
      lastWrittenRadiusRef.current = _sph.radius;
    } catch (err) {
      console.error("[ArrivalCameraDriver useFrame] swallowed error", err);
    }
  });

  return null;
}
