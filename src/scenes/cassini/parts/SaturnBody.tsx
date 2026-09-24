// src/scenes/cassini/parts/SaturnBody.tsx
//
// Saturn's sphere and texture. Loads with a manual TextureLoader so
// mounting never suspends the tree while the texture fetches.

import { useMissionStore } from "@/store/missionStore";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";
import { isTerminalTableau as isTerminalTableauId } from "../data/missionConstants";
import { getActiveTableau } from "../data/tableaus";
import { makeLogDepthShaderMaterial } from "../lib/logDepthShaderMaterial";

const SATURN_R = 180;
const SATURN_TEXTURE_PATH = "/textures/optimized/saturn_opt.webp";

// logarithmicDepthBuffer needs the logdepthbuf_* chunks injected by hand.
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
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uSunDir;
uniform vec3 uHazeColor;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);

  // Swirl detail comes off luma, re-tinted cream: the Saturn map is a
  // saturated olive, the real cloud deck a pale sand.
  vec3 tex = mix(vec3(0.85, 0.78, 0.64), texture2D(uMap, vUv).rgb, uHasMap);
  float luma = dot(tex, vec3(0.299, 0.587, 0.114));
  // Contrast for the swirls, capped short of white to stay near haze color.
  luma = clamp((luma - 0.5) * 1.5 + 0.5, 0.0, 1.0);
  vec3 cloud = vec3(0.80, 0.74, 0.60);
  vec3 deck = cloud * (0.52 + 0.42 * luma);

  float sun = dot(N, normalize(uSunDir)) * 0.5 + 0.5;
  deck *= mix(0.92, 1.06, clamp(sun, 0.0, 1.0));

  // Dissolve the grazing limb straight into the haze color over a wide band
  // so the deck melts into the atmosphere with no hard silhouette edge.
  float ndv = max(dot(N, V), 0.0);
  float limb = 1.0 - smoothstep(0.0, 0.85, ndv);
  deck = mix(deck, uHazeColor, limb);

  gl_FragColor = vec4(deck, 1.0);
}
`;

// Exported so PrewarmTerminal.tsx can compile the same program early.
export function createTerminalDeckMaterial(): THREE.ShaderMaterial {
  return makeLogDepthShaderMaterial({
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
  saturnLoadPromise = new Promise<THREE.Texture | null>((resolve) => {
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
  const isTerminal = useMissionStore((s) =>
    isTerminalTableauId(getActiveTableau(s.currentT).id),
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
    gl.initTexture(texture); // avoids a first-bind hitch
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
  // Bind the Saturn map into the space material and the terminal deck shader.
  useEffect(() => {
    if (!texture) return;
    const mat = spaceMaterialRef.current;
    if (mat) {
      mat.map = texture;
      // White once a real texture is bound, clearing the fallback tint.
      mat.color = new THREE.Color("#ffffff");
      mat.needsUpdate = true;
    }
    const deck = deckMaterialRef.current;
    if (deck) {
      deck.uniforms.uMap!.value = texture;
      deck.uniforms.uHasMap!.value = 1;
      deck.needsUpdate = true;
    }
  }, [texture]);
  // Terminal plunge swaps in the soft-deck shader; blueprint mode keeps its
  // wireframe throughout.
  const material =
    renderMode === "blueprint"
      ? blueprintMaterialRef.current
      : isTerminal
        ? deckMaterialRef.current
        : spaceMaterialRef.current;

  // Spin well past realism so the near-axisymmetric bands read as motion.
  useFrame((_, deltaRaw) => {
    try {
      if (!meshRef.current) return;
      const delta = Number.isFinite(deltaRaw)
        ? Math.min(0.1, Math.max(0, deltaRaw))
        : 0;
      const tab = getActiveTableau(useMissionStore.getState().currentT);
      const terminal = isTerminalTableauId(tab.id);
      const factor = terminal ? 12 : tab.kind === "moon" ? 600 : 1200;
      meshRef.current.rotation.y +=
        delta * ((2 * Math.PI) / (10.7 * 3600)) * factor;

      // Set imperatively here, not via the `visible` prop: that only
      // commits after the stalling terminal-entry shader compile.
      const vis = renderMode === "blueprint" ? true : !terminal;
      if (meshRef.current.visible !== vis) meshRef.current.visible = vis;
    } catch (err) {
      console.error("[SaturnBody useFrame] swallowed error", err);
    }
  });

  // No planet-sphere is visible from inside the atmosphere; SkyDome paints
  // the whole world there instead. Blueprint mode keeps its wireframe.
  const visible = renderMode === "blueprint" ? true : !isTerminal;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      visible={visible}
    />
  );
}
