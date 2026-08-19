// Live 3D ring annulus for non-terminal finale tableaus.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  RING_AXIAL_TILT_DEG,
  createRingDensityTexture,
  createRingGeometry,
  createRingMaterial,
} from "../lib/ringShader";

export function VolumetricRings() {
  const densityTexture = useMemo(() => createRingDensityTexture(), []);
  const geometry = useMemo(() => createRingGeometry(), []);
  const material = useMemo(
    () => createRingMaterial(densityTexture),
    [densityTexture],
  );

  useEffect(() => {
    return () => {
      material.dispose();
      geometry.dispose();
      densityTexture.dispose();
    };
  }, [material, geometry, densityTexture]);

  const startTimeRef = useRef(performance.now());
  const meshRef = useRef<THREE.Mesh>(null);

  const CAM_NEAR = 300;
  const CAM_FAR = 1500;
  const RING_OPACITY_CLOSE = 0.85;

  useFrame(({ camera }) => {
    if (!material) return;
    const u = material.uniforms;
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const fade = Math.min(1, elapsed / 0.6);

    const camDist = camera.position.length();
    const proximity = Math.max(
      0,
      Math.min(1, (CAM_FAR - camDist) / (CAM_FAR - CAM_NEAR)),
    );
    const distOpacity = 1 - proximity * (1 - RING_OPACITY_CLOSE);

    u.uOpacity!.value = fade * distOpacity;
  });

  useEffect(() => {
    if (meshRef.current) meshRef.current.layers.set(1);
  }, []);

  return (
    <group
      rotation={[Math.PI / 2, 0, THREE.MathUtils.degToRad(RING_AXIAL_TILT_DEG)]}
    >
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </group>
  );
}
