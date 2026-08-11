// src/scenes/cassini/parts/SaturnBody.tsx
//
// Saturn's sphere and texture. Loads with a manual TextureLoader instead of
// useLoader so mounting doesn't suspend: Saturn sits inside TableauResolver
// next to the seven pre-mounted moons, and a suspended fetch there blanked
// the whole tree until the texture landed.

import { useMissionStore } from "@/store/missionStore";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";
import { getActiveTableau } from "../data/tableaus";

const SATURN_R = 180;
const SATURN_TEXTURE_PATH = "/textures/optimized/saturn_opt.webp";

// Scene runs logarithmicDepthBuffer: true, so a raw ShaderMaterial has to
// inject the logdepthbuf_* chunks itself or its depth writes land in the
// wrong space and z-fight against the rings.
const DECK_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}
`;

const DECK_FRAG = /* glsl */ `
uniform vec3 uHazeColor;
void main() {
  gl_FragColor = vec4(uHazeColor, 1.0);
}
`;

// Grazing-camera material for the terminal plunge deck (see DECK_FRAG).
function createTerminalDeckMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: DECK_VERT,
    fragmentShader: DECK_FRAG,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-400, 80, 200).normalize() },
      uHazeColor: { value: new THREE.Color(0.86, 0.8, 0.66) },
    },
  });
}

const sharedLoader = new TextureLoader();
let cachedSaturnTexture: THREE.Texture | null = null;
let saturnLoadPromise: Promise<THREE.Texture | null> | null = null;

function loadSaturnTexture(): Promise<THREE.Texture | null> {
  if (cachedSaturnTexture) return Promise.resolve(cachedSaturnTexture);
  if (saturnLoadPromise) return saturnLoadPromise;
  saturnLoadPromise = new Promise((resolve) => {
    sharedLoader.load(
      SATURN_TEXTURE_PATH,
      (tex) => {
        cachedSaturnTexture = tex;
        resolve(tex);
      },
      undefined,
      (err) => {
        console.warn(`[SaturnBody] failed to load ${SATURN_TEXTURE_PATH}`, err);
        resolve(null);
      },
    );
  });
  return saturnLoadPromise;
}

export function SaturnBody({ renderMode }: { renderMode: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { gl } = useThree();

  const [texture, setTexture] = useState<THREE.Texture | null>(
    cachedSaturnTexture,
  );

  // Kick off the load on first mount
  useEffect(() => {
    if (texture) return;
    let cancelled = false;
    loadSaturnTexture().then((tex) => {
      if (!cancelled && tex) setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [texture]);

  useEffect(() => {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
  }, [texture, gl]);

  useEffect(() => {
    if (meshRef.current) meshRef.current.layers.set(1);
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(SATURN_R, 128, 64);
    g.scale(1.0, 0.9015, 1.0);
    return g;
  }, []);

  const spaceMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const blueprintMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  if (!spaceMaterialRef.current) {
    spaceMaterialRef.current = new THREE.MeshStandardMaterial({
      color: "#c4a065",
      roughness: 0.95,
      metalness: 0.0,
    });
  }
  if (!blueprintMaterialRef.current) {
    blueprintMaterialRef.current = new THREE.MeshBasicMaterial({
      color: "#8fd2ff",
      wireframe: true,
      transparent: true,
      opacity: 0.07,
    });
  }
  const deckMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  if (!deckMaterialRef.current) {
    deckMaterialRef.current = createTerminalDeckMaterial();
  }
  // Bind the texture into the space material whenever it (re)resolves.
  useEffect(() => {
    if (spaceMaterialRef.current && texture) {
      spaceMaterialRef.current.map = texture;
      spaceMaterialRef.current.color = new THREE.Color("#ffffff");
      spaceMaterialRef.current.needsUpdate = true;
    }
  }, [texture]);
  const material =
    renderMode === "blueprint"
      ? blueprintMaterialRef.current
      : spaceMaterialRef.current;

  // Spin well past realism (true 10.7h rotation reads as static, since the
  // bands are near-axisymmetric). Slower when Saturn is a backdrop behind
  // a moon than when it's the focal subject, so it doesn't upstage the
  // foreground.
  useFrame((_, deltaRaw) => {
    try {
      if (!meshRef.current) return;
      const delta = Number.isFinite(deltaRaw)
        ? Math.min(0.1, Math.max(0, deltaRaw))
        : 0;
      const tab = getActiveTableau(useMissionStore.getState().currentT);
      const factor = tab.kind === "moon" ? 600 : 1200;
      meshRef.current.rotation.y +=
        delta * ((2 * Math.PI) / (10.7 * 3600)) * factor;
    } catch (err) {
      console.error("[SaturnBody useFrame] swallowed error", err);
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
