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
import { isTerminalTableau as isTerminalTableauId } from "../data/missionConstants";
import { getActiveTableau } from "../data/tableaus";
import { makeLogDepthShaderMaterial } from "../lib/logDepthShaderMaterial";

const SATURN_R = 180;
const SATURN_TEXTURE_PATH = "/textures/optimized/saturn_opt.webp";
// Dramatic storm map for the terminal deck only. Saturn keeps its normal
// texture everywhere else, right up to the atmosphere entry.
const STORM_TEXTURE_PATH = "/textures/finale/saturn_storm_8k.webp";

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

  // The raw storm map (hexagon included) is a saturated olive. Drive the
  // swirl detail off its luma instead of its hue, and re-tint cream so it
  // reads as brightness variation against the atmosphere, not a green ball.
  vec3 tex = mix(vec3(0.85, 0.78, 0.64), texture2D(uMap, vUv).rgb, uHasMap);
  float luma = dot(tex, vec3(0.299, 0.587, 0.114));
  // Contrast for the swirls, but capped short of white so the deck stays
  // close to the haze color instead of reading as a bright ball in the sky.
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

// Grazing-camera material for the terminal plunge deck (see DECK_FRAG).
// DECK_VERT/DECK_FRAG already carry their own logdepthbuf chunks, so the
// factory passes them through untouched; this just keeps every scene
// material going through the same construction path.
function createTerminalDeckMaterial(): THREE.ShaderMaterial {
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
let cachedStormTexture: THREE.Texture | null = null;
let stormLoadPromise: Promise<THREE.Texture | null> | null = null;

function loadTextureOnce(
  path: string,
  getCache: () => THREE.Texture | null,
  setCache: (t: THREE.Texture) => void,
  getPromise: () => Promise<THREE.Texture | null> | null,
  setPromise: (p: Promise<THREE.Texture | null>) => void,
): Promise<THREE.Texture | null> {
  const cached = getCache();
  if (cached) return Promise.resolve(cached);
  const existing = getPromise();
  if (existing) return existing;
  const p = new Promise<THREE.Texture | null>((resolve) => {
    sharedLoader.load(
      path,
      (tex) => {
        setCache(tex);
        resolve(tex);
      },
      undefined,
      (err) => {
        console.warn(`[SaturnBody] failed to load ${path}`, err);
        resolve(null);
      },
    );
  });
  setPromise(p);
  return p;
}

function loadSaturnTexture(): Promise<THREE.Texture | null> {
  return loadTextureOnce(
    SATURN_TEXTURE_PATH,
    () => cachedSaturnTexture,
    (t) => {
      cachedSaturnTexture = t;
    },
    () => saturnLoadPromise,
    (p) => {
      saturnLoadPromise = p;
    },
  );
}

function loadStormTexture(): Promise<THREE.Texture | null> {
  return loadTextureOnce(
    STORM_TEXTURE_PATH,
    () => cachedStormTexture,
    (t) => {
      cachedStormTexture = t;
    },
    () => stormLoadPromise,
    (p) => {
      stormLoadPromise = p;
    },
  );
}

export function SaturnBody({ renderMode }: { renderMode: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { gl } = useThree();

  const [texture, setTexture] = useState<THREE.Texture | null>(
    cachedSaturnTexture,
  );
  const [stormTexture, setStormTexture] = useState<THREE.Texture | null>(
    cachedStormTexture,
  );
  const isTerminal = useMissionStore((s) =>
    isTerminalTableauId(getActiveTableau(s.currentT).id),
  );

  // Kick off the loads on first mount
  useEffect(() => {
    let cancelled = false;
    if (!texture) {
      loadSaturnTexture().then((tex) => {
        if (!cancelled && tex) setTexture(tex);
      });
    }
    if (!stormTexture) {
      loadStormTexture().then((tex) => {
        if (!cancelled && tex) setStormTexture(tex);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [texture, stormTexture]);

  useEffect(() => {
    const maxAniso = Math.min(16, gl.capabilities.getMaxAnisotropy());
    for (const tex of [texture, stormTexture]) {
      if (!tex) continue;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      // Storm map ships upside down relative to the standard equirectangular
      // convention the other textures use.
      if (tex === stormTexture) tex.flipY = false;
      tex.needsUpdate = true;
    }
  }, [texture, stormTexture, gl]);

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
  // Bind the active map into the space material: the storm texture during
  // the terminal plunge, the normal Saturn map everywhere else.
  useEffect(() => {
    const mat = spaceMaterialRef.current;
    if (mat) {
      const active = isTerminal && stormTexture ? stormTexture : texture;
      if (active) {
        mat.map = active;
        mat.color = new THREE.Color("#ffffff");
        mat.needsUpdate = true;
      }
    }
    const deck = deckMaterialRef.current;
    if (deck) {
      const deckTex = stormTexture ?? texture;
      if (deckTex) {
        deck.uniforms.uMap!.value = deckTex;
        deck.uniforms.uHasMap!.value = 1;
        deck.needsUpdate = true;
      }
    }
  }, [texture, stormTexture, isTerminal]);
  // Terminal plunge swaps in the soft-deck shader; blueprint mode keeps its
  // wireframe throughout.
  const material =
    renderMode === "blueprint"
      ? blueprintMaterialRef.current
      : isTerminal
        ? deckMaterialRef.current
        : spaceMaterialRef.current;

  // Spin well past realism (true 10.7h rotation reads as static, since the
  // bands are near-axisymmetric). Slower when Saturn is a backdrop behind
  // a moon than when it's the focal subject, so it doesn't upstage the
  // foreground. Near-still during the terminal plunge, where the camera
  // grazes the cloud tops and the normal spin would whip the deck by.
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

      // React's `visible` prop below only updates on the commit after
      // currentT crosses into the terminal window, and that commit is the
      // one that stalls on the terminal stage's synchronous shader compiles
      // - so the stale sphere stays painted for the whole stall. This
      // priority-0 callback sees the fresh t and hides it in the same frame
      // the boundary is crossed instead.
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
