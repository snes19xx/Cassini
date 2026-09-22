// src/scenes/cassini/arrival/parts/ArrivalRings.tsx
//
// Builds the arrival's rings from the shared finale/lib/ringShader.ts
// factories. The constants below are the finale's locked ring values, copied
// in directly

import { useMissionStore } from "@/store/missionStore";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  createRingDensityTexture,
  createRingGeometry,
  createRingMaterial,
} from "../../finale/lib/ringShader";
import { arrivalProgress, arrivalRollRad } from "../lib/arrivalShot";

// swirlAmount 0 turns the procedural swirl off. The textured layer below is the ring detail.
const RING_COLOR = new THREE.Color(1.0, 0.82, 0.57);
const RING_OPACITY = 0.46;
const SWIRL_BASE = 0.73;
const SWIRL_AMOUNT = 0.0;
const DETAIL_OPACITY = 0.41;

const FADE_IN_SEC = 0.6;

const DETAIL_TEXTURE_PATH = "/textures/saturn_rings.png";
const DETAIL_INNER = 222.5;
const DETAIL_OUTER = 419.3;
const DETAIL_SEGMENTS = 256;

function makeDetailGeometry(): THREE.RingGeometry {
  const PHI = 1;
  const g = new THREE.RingGeometry(
    DETAIL_INNER,
    DETAIL_OUTER,
    DETAIL_SEGMENTS,
    PHI,
  );
  const uv = g.attributes.uv;
  if (uv) {
    const vertsPerRing = DETAIL_SEGMENTS + 1;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, Math.floor(i / vertsPerRing) / PHI, 0.5);
    }
    uv.needsUpdate = true;
  }
  return g;
}

// VolumetricRings is not reused here: it reads the finale debug store every frame.
export function ArrivalRings() {
  const densityTexture = useMemo(() => createRingDensityTexture(), []);
  const geometry = useMemo(() => createRingGeometry(), []);
  const material = useMemo(
    () => createRingMaterial(densityTexture),
    [densityTexture],
  );

  useEffect(() => {
    const u = material.uniforms;
    (u.uRingColor!.value as THREE.Color).copy(RING_COLOR);
    u.uSwirlBase!.value = SWIRL_BASE;
    u.uSwirlAmount!.value = SWIRL_AMOUNT;
  }, [material]);

  const detailGeometry = useMemo(() => makeDetailGeometry(), []);
  const detailMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        alphaTest: 0.01,
      }),
    [],
  );
  const [detailTex, setDetailTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (detailTex) return;
    let cancelled = false;
    new THREE.TextureLoader().load(DETAIL_TEXTURE_PATH, (tex) => {
      if (cancelled) return;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      detailMaterial.map = tex;
      detailMaterial.needsUpdate = true;
      setDetailTex(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [detailTex, detailMaterial]);

  useEffect(() => {
    return () => {
      material.dispose();
      geometry.dispose();
      densityTexture.dispose();
      detailMaterial.dispose();
      detailGeometry.dispose();
    };
  }, [material, geometry, densityTexture, detailMaterial, detailGeometry]);

  // Layer 1 matches Saturn. SceneLighting skips this layer the way it skips Saturn.
  const meshRef = useRef<THREE.Mesh>(null);
  const detailMeshRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (meshRef.current) meshRef.current.layers.set(1);
    if (detailMeshRef.current) detailMeshRef.current.layers.set(1);
  }, [detailTex]);

  const groupRef = useRef<THREE.Group>(null);
  const mountedAtRef = useRef(performance.now());

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    try {
      const t = useMissionStore.getState().currentT;
      // Rolls on the same curve TableauResolver applies to the Saturn body.
      group.rotation.z = arrivalRollRad(arrivalProgress(t));

      const elapsed = (performance.now() - mountedAtRef.current) / 1000;
      const fade = Math.min(1, elapsed / FADE_IN_SEC);
      material.uniforms.uOpacity!.value = RING_OPACITY * fade;
      if (detailMaterial.map) {
        detailMaterial.opacity = DETAIL_OPACITY * fade;
      }
    } catch (err) {
      console.error("[ArrivalRings useFrame] swallowed error", err);
    }
  });

  // Two nested groups, not one Euler: three applies Z before the X flip by default.
  // The outer group rolls after the inner one lays the rings flat.
  return (
    <group ref={groupRef}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh ref={meshRef} geometry={geometry} material={material} />
        {detailTex && (
          <mesh
            ref={detailMeshRef}
            geometry={detailGeometry}
            material={detailMaterial}
            renderOrder={1}
          />
        )}
      </group>
    </group>
  );
}
