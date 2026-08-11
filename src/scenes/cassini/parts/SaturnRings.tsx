// src/scenes/cassini/parts/SaturnRings.tsx
//
// Saturn's ring plane. Same never-suspends texture pattern as SaturnBody:
// manual TextureLoader, starts transparent, fades in once the map lands
// instead of flashing an untextured stripe.

import { useMissionStore } from "@/store/missionStore";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";
import { stateAt } from "../lib/stateAt";

const RING_INNER = 222.5;
const RING_OUTER = 419.3;
const SEGMENTS = 256;
const RINGS_TEXTURE_PATH = "/textures/saturn_rings.png";

const sharedLoader = new TextureLoader();
let cachedRingTexture: THREE.Texture | null = null;
let ringLoadPromise: Promise<THREE.Texture | null> | null = null;

function loadRingTexture(): Promise<THREE.Texture | null> {
  if (cachedRingTexture) return Promise.resolve(cachedRingTexture);
  if (ringLoadPromise) return ringLoadPromise;
  ringLoadPromise = new Promise((resolve) => {
    sharedLoader.load(
      RINGS_TEXTURE_PATH,
      (tex) => {
        cachedRingTexture = tex;
        resolve(tex);
      },
      undefined,
      (err) => {
        console.warn(`[SaturnRings] failed to load ${RINGS_TEXTURE_PATH}`, err);
        resolve(null);
      },
    );
  });
  return ringLoadPromise;
}

export function SaturnRings({ renderMode }: { renderMode: string }) {
  const materialRef = useRef<THREE.Material | null>(null);

  const [ringTexture, setRingTexture] = useState<THREE.Texture | null>(
    cachedRingTexture,
  );

  useEffect(() => {
    if (ringTexture) return;
    let cancelled = false;
    loadRingTexture().then((tex) => {
      if (!cancelled && tex) setRingTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [ringTexture]);

  // Configure filtering / wrap whenever the texture resolves.
  useEffect(() => {
    if (!ringTexture) return;
    ringTexture.wrapS = THREE.ClampToEdgeWrapping;
    ringTexture.wrapT = THREE.ClampToEdgeWrapping;
    ringTexture.minFilter = THREE.LinearFilter;
    ringTexture.magFilter = THREE.LinearFilter;
    ringTexture.needsUpdate = true;
  }, [ringTexture]);

  const geometry = useMemo(() => {
    const PHI_SEGMENTS = 1;
    const g = new THREE.RingGeometry(
      RING_INNER,
      RING_OUTER,
      SEGMENTS,
      PHI_SEGMENTS,
    );

    // RingGeometry lays vertices out as concentric rings of SEGMENTS+1
    // each, so the ring index doubles as an exact 0..1 radial u.
    const uv = g.attributes.uv;
    if (uv) {
      const vertsPerRing = SEGMENTS + 1;
      for (let i = 0; i < uv.count; i++) {
        const ringIndex = Math.floor(i / vertsPerRing);
        const u = ringIndex / PHI_SEGMENTS;
        uv.setXY(i, u, 0.5);
      }
      uv.needsUpdate = true;
    }
    return g;
  }, []);

  const spaceMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const blueprintMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  if (!spaceMaterialRef.current) {
    spaceMaterialRef.current = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      alphaTest: 0.01,
    });
  }
  if (!blueprintMaterialRef.current) {
    blueprintMaterialRef.current = new THREE.MeshBasicMaterial({
      color: "#8fd2ff",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
      wireframe: false,
    });
  }
  useEffect(() => {
    if (spaceMaterialRef.current && ringTexture) {
      spaceMaterialRef.current.map = ringTexture;
      spaceMaterialRef.current.opacity = 0.85;
      spaceMaterialRef.current.needsUpdate = true;
    }
  }, [ringTexture]);
  const material =
    renderMode === "blueprint"
      ? blueprintMaterialRef.current
      : spaceMaterialRef.current;

  useFrame(() => {
    if (!materialRef.current) return;
    try {
      const t = useMissionStore.getState().currentT;
      const s = stateAt(t);
      const flash = (s as any).ringCrossingIntensity || 0;

      if (renderMode === "space" || renderMode === "editorial") {
        if (!ringTexture) return;
        (materialRef.current as THREE.MeshBasicMaterial).opacity = Math.min(
          1.0,
          0.85 + flash * 0.4,
        );
      } else if (renderMode === "blueprint") {
        (materialRef.current as THREE.MeshBasicMaterial).opacity = Math.min(
          1.0,
          0.15 + flash * 0.5,
        );
      }
    } catch (err) {
      console.error("[SaturnRings useFrame] swallowed error", err);
    }
  });

  // Rings live on layer 1 alongside the Saturn body
  const meshRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (meshRef.current) meshRef.current.layers.set(1);
  }, []);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[Math.PI / 2, 0, THREE.MathUtils.degToRad(26.73)]}
    >
      <primitive object={material} attach="material" ref={materialRef} />
    </mesh>
  );
}
