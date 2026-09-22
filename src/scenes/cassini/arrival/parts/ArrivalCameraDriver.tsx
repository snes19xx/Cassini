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
  TITAN_CAMERA_POS,
  TITAN_TABLEAU_ID,
  accumulateArrivalZoom,
  arrivalDepartureState,
  arrivalPolarRad,
  arrivalProgress,
  arrivalRadius,
  arrivalSwingProgress,
  isArrivalTableau,
  titanEntryProgress,
  titanEntryState,
} from "../lib/arrivalShot";

// Ease from wherever the ride-along left the camera onto the scripted pose.
const BLEND_MS = 600;

// Must be inside the active tableau's zoom clamps (saturn_arrival 400-15200,
// titan_huygens 70-2200).
const DEPART_TARGET_LEAD = 1200;
const ENTRY_TARGET_LEAD = 400;

const _offset = new THREE.Vector3();
const _sph = new THREE.Spherical();
const _next = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _aim = new THREE.Vector3();

function smoothstep01(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

export function ArrivalCameraDriver() {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: { target?: THREE.Vector3; update?: () => void } | null;
  };

  const armedRef = useRef(false);
  const blendStartRef = useRef(0);
  const blendFromRadiusRef = useRef(0);
  const blendFromPolarRef = useRef(0);
  const lastWrittenRadiusRef = useRef(0);
  const zoomRef = useRef(1);
  // the swing continues from wherever the user had orbited to
  const swingAzRef = useRef<number | null>(null);
  const sawDepartureRef = useRef(false);
  const entryCommittedRef = useRef(false);
  // True while the departure or entry beat holds controls.target ahead of the lens.
  const targetOffOriginRef = useRef(false);
  const cameraResetNonce = useMissionStore((s) => s.cameraResetNonce);
  const lastNonceRef = useRef(cameraResetNonce);
  if (lastNonceRef.current !== cameraResetNonce) {
    lastNonceRef.current = cameraResetNonce;
    sawDepartureRef.current = false;
  }

  useFrame(() => {
    try {
      const t = useMissionStore.getState().currentT;
      const tab = getActiveTableau(t);

      // Titan entry is the second half of the SOI handoff; it runs on mission t.
      if (tab.id === TITAN_TABLEAU_ID) {
        armedRef.current = false;
        swingAzRef.current = null;
        if (!sawDepartureRef.current) return;
        const v = titanEntryProgress(t);
        if (v >= 1) {
          // Commits once: OrbitControls then reads the tableau preset, not
          // the lead point past Titan.
          if (!entryCommittedRef.current) {
            entryCommittedRef.current = true;
            camera.position.set(
              TITAN_CAMERA_POS[0],
              TITAN_CAMERA_POS[1],
              TITAN_CAMERA_POS[2],
            );
            if (controls?.target) controls.target.set(0, 0, 0);
            camera.lookAt(0, 0, 0);
            controls?.update?.();
            targetOffOriginRef.current = false;
          }
          return;
        }
        entryCommittedRef.current = false;
        const st = titanEntryState(v);
        camera.position.set(st.pos[0], st.pos[1], st.pos[2]);
        _aim.set(st.aim[0], st.aim[1], st.aim[2]);
        _next.copy(camera.position).addScaledVector(_aim, ENTRY_TARGET_LEAD);
        if (controls?.target) controls.target.copy(_next);
        camera.lookAt(_next);
        targetOffOriginRef.current = true;
        return;
      }

      if (!isArrivalTableau(tab.id)) {
        armedRef.current = false;
        swingAzRef.current = null;
        sawDepartureRef.current = false;
        entryCommittedRef.current = false;
        return;
      }
      // TransitionDriver's cruise ride-along has the first 2.2s.
      if (useTransitionStore.getState().phase === "flying") {
        armedRef.current = false;
        return;
      }

      // The departure drives the camera directly. Aim leaves Saturn here;
      // controls.target rides ahead of the lens.
      const p0 = arrivalProgress(t);
      const u = arrivalSwingProgress(p0);
      if (u > 0) {
        if (swingAzRef.current === null) {
          swingAzRef.current = Math.atan2(camera.position.x, camera.position.z);
        }
        sawDepartureRef.current = true;
        const st = arrivalDepartureState(u, swingAzRef.current);
        camera.position.set(st.pos[0], st.pos[1], st.pos[2]);
        _aim.set(st.aim[0], st.aim[1], st.aim[2]);
        _next.copy(camera.position).addScaledVector(_aim, DEPART_TARGET_LEAD);
        if (controls?.target) controls.target.copy(_next);
        camera.lookAt(_next);
        targetOffOriginRef.current = true;
        lastWrittenRadiusRef.current = camera.position.length();
        return;
      }
      swingAzRef.current = null;

      // Scrubbing back from the departure or entry pan leaves controls.target
      // parked ahead of the lens; reset it to Saturn's centre.
      if (targetOffOriginRef.current) {
        targetOffOriginRef.current = false;
        armedRef.current = false;
        if (controls?.target) controls.target.set(0, 0, 0);
      }

      const target = controls?.target ?? _origin;
      _offset.copy(camera.position).sub(target);
      if (_offset.lengthSq() < 1e-6) return;
      _sph.setFromVector3(_offset);

      const scriptRadius = arrivalRadius(p0);
      const scriptPolar = arrivalPolarRad(p0);

      if (!armedRef.current) {
        armedRef.current = true;
        // Cuts when the camera is far from the script (entering from
        // cruise); eases when close (JUMP-TO or resuming after a fly).
        const offBy = Math.max(
          _sph.radius / scriptRadius,
          scriptRadius / _sph.radius,
        );
        const snap = !Number.isFinite(offBy) || offBy > ARRIVAL_SNAP_RATIO;
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
