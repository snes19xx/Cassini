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
  type RingSource,
} from "../lib/ringBackdropDebug";

const RTT_SIZE = 2048;

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

  const dirtyRef = useRef(true);

  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(RTT_SIZE, RTT_SIZE, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false,
      }),
    [],
  );

  const rtt = useMemo(() => {
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
      rtt.texMat.map = tex;
      rtt.texMat.needsUpdate = true;
      setRingTex(tex);
      dirtyRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [rtt]);

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
      rtt.density.dispose();
      rtt.procGeo.dispose();
      rtt.procMat.dispose();
      rtt.texGeo.dispose();
      rtt.texMat.dispose();
      cardMat.dispose();
      cardGeo.dispose();
    };
  }, [rt, rtt, cardMat, cardGeo]);

  const ringSource = useRingBackdropStore((s) => s.ringSource);
  const bakeElev = useRingBackdropStore((s) => s.bakeElev);
  const bakeReach = useRingBackdropStore((s) => s.bakeReach);
  const bakeFov = useRingBackdropStore((s) => s.bakeFov);
  const bakeBrightness = useRingBackdropStore((s) => s.bakeBrightness);
  useEffect(() => {
    dirtyRef.current = true;
  }, [ringSource, bakeElev, bakeReach, bakeFov, bakeBrightness, ringTex]);

  const _prevClear = useMemo(() => new THREE.Color(), []);
  function renderRings() {
    const s = useRingBackdropStore.getState();
    const source: RingSource = s.ringSource;

    rtt.scene.remove(rtt.procMesh, rtt.texMesh);
    const useTextured = source === "textured" && !!rtt.texMat.map;
    if (useTextured) {
      rtt.texMat.color.setScalar(Math.min(1, s.bakeBrightness));
      rtt.scene.add(rtt.texMesh);
    } else {
      rtt.procMat.uniforms.uOpacity!.value = s.bakeBrightness;
      rtt.scene.add(rtt.procMesh);
    }

    const cam = rtt.camera;
    cam.fov = s.bakeFov;
    cam.position.set(0, s.bakeElev, 0);
    cam.lookAt(s.bakeReach, 0, 0);
    cam.updateProjectionMatrix();

    const prevTarget = gl.getRenderTarget();
    gl.getClearColor(_prevClear);
    const prevAlpha = gl.getClearAlpha();

    gl.setRenderTarget(rt);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, false);
    gl.render(rtt.scene, cam);

    gl.setRenderTarget(prevTarget);
    gl.setClearColor(_prevClear, prevAlpha);
  }

  useEffect(() => {
    gl.localClippingEnabled = true;
    cardMat.needsUpdate = true;
  }, [gl, cardMat]);

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const _dir = useMemo(() => new THREE.Vector3(), []);
  const _right = useMemo(() => new THREE.Vector3(), []);
  const _up = useMemo(() => new THREE.Vector3(), []);
  const _pos = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    if (dirtyRef.current) {
      renderRings();
      dirtyRef.current = false;
    }

    const g = groupRef.current;
    const m = meshRef.current;
    if (!g || !m) return;
    const s = useRingBackdropStore.getState();

    clipPlane.constant = -(camera.position.y + s.horizonClip);

    const pos = cardGeo.attributes.position;
    if (
      pos &&
      (s.topTaper !== lastTaperRef.current.t ||
        s.bottomTaper !== lastTaperRef.current.b ||
        s.curvature !== lastTaperRef.current.c)
    ) {
      for (let i = 0; i < pos.count; i++) {
        const yN = (cardBase.by[i] ?? 0) / 0.5;
        const tN = (yN + 1) * 0.5;
        const widthMul = s.bottomTaper + (s.topTaper - s.bottomTaper) * tN;
        const x = (cardBase.bx[i] ?? 0) * widthMul + s.curvature * yN * yN;
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
      lastTaperRef.current = {
        t: s.topTaper,
        b: s.bottomTaper,
        c: s.curvature,
      };
    }

    camera.getWorldDirection(_dir).normalize();
    _up.set(0, 1, 0);
    _right.crossVectors(_dir, _up).normalize();
    _up.crossVectors(_right, _dir).normalize();

    _pos
      .copy(camera.position)
      .addScaledVector(_dir, s.distance)
      .addScaledVector(_right, s.offsetRight)
      .addScaledVector(_up, s.offsetUp);
    g.position.copy(_pos);
    g.lookAt(camera.position);
    g.rotateZ(THREE.MathUtils.degToRad(s.rollDeg));

    m.scale.set(s.scaleX, s.scaleY, 1);
    (m.material as THREE.MeshBasicMaterial).opacity = s.opacity;
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
