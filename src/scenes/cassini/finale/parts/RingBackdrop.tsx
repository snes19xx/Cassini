// Ring billboard for terminal tableaus where the locked camera can't use a real disk.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  createRingDensityTexture,
  createRingGeometry,
  createRingMaterial,
} from "../lib/ringShader";
import {
  useRingBackdropStore,
} from "../lib/ringBackdropDebug";

const BAKE_SIZE = 2048;

const TEXTURED_RING_PATH = "/textures/saturn_rings.png";
const TEX_INNER = 222.5;
const TEX_OUTER = 419.3;
const TEX_SEGMENTS = 256;

function makeTexturedRingGeometry(): THREE.RingGeometry {
  const PHI = 1;
  const g = new THREE.RingGeometry(TEX_INNER, TEX_OUTER, TEX_SEGMENTS, PHI);
  const uv = g.attributes.uv;
  if (uv) {
    const vertsPerRing = TEX_SEGMENTS + 1;
    for (let i = 0; i < uv.count; i++) {
      const ringIndex = Math.floor(i / vertsPerRing);
      uv.setXY(i, ringIndex / PHI, 0.5);
    }
    uv.needsUpdate = true;
  }
  return g;
}

export function RingBackdrop() {
  const gl = useThree((s) => s.gl);

  const needsBakeRef = useRef(true);

  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(BAKE_SIZE, BAKE_SIZE, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false,
      }),
    [],
  );

  const bake = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 1, 6000);

    const density = createRingDensityTexture();
    const procGeo = createRingGeometry();
    const procMat = createRingMaterial(density);
    procMat.uniforms.uOpacity!.value = 1;
    procMat.uniforms.uTime!.value = 0;
    procMat.blending = THREE.NoBlending;
    const procMesh = new THREE.Mesh(procGeo, procMat);
    procMesh.rotation.x = Math.PI / 2;

    const texGeo = makeTexturedRingGeometry();
    const texMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.01,
      blending: THREE.NoBlending,
      depthWrite: false,
    });
    const texMesh = new THREE.Mesh(texGeo, texMat);
    texMesh.rotation.x = Math.PI / 2;

    return {
      scene,
      camera,
      density,
      procGeo,
      procMat,
      procMesh,
      texGeo,
      texMat,
      texMesh,
    };
  }, []);

  const [ringTex, setRingTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    new THREE.TextureLoader().load(TEXTURED_RING_PATH, (tex) => {
      if (cancelled) return;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      bake.texMat.map = tex;
      bake.texMat.needsUpdate = true;
      setRingTex(tex);
      needsBakeRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [bake]);

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const cardMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: rt.texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        fog: false,
        side: THREE.DoubleSide,
        clippingPlanes: [clipPlane],
      }),
    [rt, clipPlane],
  );
  const cardGeo = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 32), []);
  const cardBase = useMemo(() => {
    const pos = cardGeo.attributes.position;
    const count = pos ? pos.count : 0;
    const bx = new Float32Array(count);
    const by = new Float32Array(count);
    if (pos) {
      for (let i = 0; i < count; i++) {
        bx[i] = pos.getX(i);
        by[i] = pos.getY(i);
      }
    }
    return { bx, by };
  }, [cardGeo]);
  const lastTaperRef = useRef({ t: NaN, b: NaN, c: NaN });

  useEffect(() => {
    return () => {
      rt.dispose();
      bake.density.dispose();
      bake.procGeo.dispose();
      bake.procMat.dispose();
      bake.texGeo.dispose();
      bake.texMat.dispose();
      cardMat.dispose();
      cardGeo.dispose();
    };
  }, [rt, bake, cardMat, cardGeo]);

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (needsBakeRef.current) {
      needsBakeRef.current = false;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={cardGeo}
        material={cardMat}
        renderOrder={-900}
        frustumCulled={false}
      />
    </group>
  );
}
