// Live 3D ring annulus for non-terminal finale tableaus.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useMissionStore } from "../../../../store/missionStore";
import { isTerminalTableau as isTerminalTableauId } from "../../data/missionConstants";
import { getActiveTableau } from "../../data/tableaus";
import {
  RING_AXIAL_TILT_DEG,
  buildRingNoiseTexture,
  createRingDensityTexture,
  createRingGeometry,
  createRingMaterial,
} from "../lib/ringShader";
import { useFinaleRingsStore } from "../lib/finaleRingsDebug";

const DETAIL_TEXTURE_PATH = "/textures/saturn_rings.png";
const DETAIL_INNER = 222.5;
const DETAIL_OUTER = 419.3;
const DETAIL_SEGMENTS = 256;

function makeTexturedRingGeometry(): THREE.RingGeometry {
  const PHI = 1;
  const g = new THREE.RingGeometry(DETAIL_INNER, DETAIL_OUTER, DETAIL_SEGMENTS, PHI);
  const uv = g.attributes.uv;
  if (uv) {
    const vertsPerRing = DETAIL_SEGMENTS + 1;
    for (let i = 0; i < uv.count; i++) {
      const ringIndex = Math.floor(i / vertsPerRing);
      uv.setXY(i, ringIndex / PHI, 0.5);
    }
    uv.needsUpdate = true;
  }
  return g;
}

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

  const bakeRev = useFinaleRingsStore((s) => s.bakeRev);
  const overrideNoiseRef = useRef<THREE.DataTexture | null>(null);
  useEffect(() => {
    if (bakeRev === 0) return;
    const t = useFinaleRingsStore.getState().swirlBakeTime;
    const tex = buildRingNoiseTexture(t);
    overrideNoiseRef.current?.dispose();
    overrideNoiseRef.current = tex;
    material.uniforms.uNoiseTex!.value = tex;
  }, [bakeRev, material]);
  useEffect(() => {
    return () => overrideNoiseRef.current?.dispose();
  }, []);

  const startTimeRef = useRef(performance.now());
  const meshRef = useRef<THREE.Mesh>(null);

  const texOpacity = useFinaleRingsStore((s) => s.texOpacity);
  const showDetail = texOpacity > 0.001;
  const detailGeometry = useMemo(() => makeTexturedRingGeometry(), []);
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
    if (!showDetail || detailTex) return;
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
  }, [showDetail, detailTex, detailMaterial]);
  const detailMeshRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    return () => {
      detailMaterial.dispose();
      detailGeometry.dispose();
    };
  }, [detailMaterial, detailGeometry]);

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

    const tId = getActiveTableau(useMissionStore.getState().currentT).id;
    const terminalScale = isTerminalTableauId(tId) ? 0.9 : 1.0;

    const d = useFinaleRingsStore.getState();
    (u.uRingColor!.value as THREE.Color).setRGB(d.ringR, d.ringG, d.ringB);
    u.uSwirlBase!.value = d.swirlBase;
    u.uSwirlAmount!.value = d.swirlAmount;

    const ringOpacity = fade * distOpacity * terminalScale * d.ringOpacity;
    u.uOpacity!.value = ringOpacity;

    if (detailMaterial.map) {
      detailMaterial.opacity = d.texOpacity * fade * distOpacity * terminalScale;
    }
  });

  useEffect(() => {
    if (meshRef.current) meshRef.current.layers.set(1);
    if (detailMeshRef.current) detailMeshRef.current.layers.set(1);
  }, [showDetail]);

  return (
    <group
      rotation={[Math.PI / 2, 0, THREE.MathUtils.degToRad(RING_AXIAL_TILT_DEG)]}
    >
      <mesh ref={meshRef} geometry={geometry} material={material} />
      {showDetail && (
        <mesh
          ref={detailMeshRef}
          geometry={detailGeometry}
          material={detailMaterial}
          renderOrder={1}
        />
      )}
    </group>
  );
}
