// Cassini's terminal contrail. Renders two overlaid ribbon passes: a wide
// soft haze and a narrow bright core, just like the JPL video
// https://www.youtube.com/watch?v=xrGAQCq9BMU

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useMissionStore } from "../../../../store/missionStore";
import { TERMINAL_T_START } from "../../data/missionConstants";
import { getPlungeCassiniPos } from "../lib/plungeTrajectory";

const T_START = TERMINAL_T_START;
const T_END = 1.0001;
const K = 128;

const VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    #include <logdepthbuf_fragment>
    if (vAlpha < 0.002) discard;
    gl_FragColor = vec4(uColor, vAlpha);
  }
`;

function makeRibbonBuffers() {
  const positions = new Float32Array(K * 2 * 3);
  const alphas = new Float32Array(K * 2);
  const indices = new Uint16Array((K - 1) * 6);
  for (let k = 0; k < K - 1; k++) {
    const a = k * 2,
      o = k * 6;
    indices[o] = a;
    indices[o + 1] = a + 1;
    indices[o + 2] = a + 2;
    indices[o + 3] = a + 1;
    indices[o + 4] = a + 3;
    indices[o + 5] = a + 2;
  }
  return { positions, alphas, indices };
}

function makeGeometry(buf: ReturnType<typeof makeRibbonBuffers>) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(buf.positions, 3));
  g.setAttribute("aAlpha", new THREE.BufferAttribute(buf.alphas, 1));
  g.setIndex(new THREE.BufferAttribute(buf.indices, 1));
  return g;
}

function makeMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uColor: { value: new THREE.Color(1, 1, 1) } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
}

export function CassiniTrail() {
  const camera = useThree((s) => s.camera);
  const hazeRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  // Two independent ribbon buffers: haze (wide/soft) + core (thin/bright).
  const hazeBuf = useMemo(makeRibbonBuffers, []);
  const coreBuf = useMemo(makeRibbonBuffers, []);
  const hazeGeo = useMemo(() => makeGeometry(hazeBuf), [hazeBuf]);
  const coreGeo = useMemo(() => makeGeometry(coreBuf), [coreBuf]);
  const hazeMat = useMemo(makeMaterial, []);
  const coreMat = useMemo(makeMaterial, []);

  useEffect(() => {
    return () => {
      hazeGeo.dispose();
      hazeMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
    };
  }, [hazeGeo, hazeMat, coreGeo, coreMat]);

  // Scratch vectors, allocated once and reused every frame.
  const _p = useMemo(() => new THREE.Vector3(), []);
  const _pN = useMemo(() => new THREE.Vector3(), []);
  const _tan = useMemo(() => new THREE.Vector3(), []);
  const _view = useMemo(() => new THREE.Vector3(), []);
  const _side = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!hazeRef.current || !coreRef.current) return;

    const t = useMissionStore.getState().currentT;
    const windowT = T_END - T_START;
    const traveled = Math.max(0, t - T_START);
    const span = Math.min(traveled, windowT);

    const hPos = hazeBuf.positions;
    const cPos = coreBuf.positions;

    for (let k = 0; k < K; k++) {
      const kn = k / (K - 1); // head to tail
      const tk = Math.max(T_START, t - kn * span);
      const tkn = Math.max(T_START, tk - span / (K - 1) - 1e-6);

      getPlungeCassiniPos(tk, _p);
      getPlungeCassiniPos(tkn, _pN);

      _tan.subVectors(_p, _pN);
      if (_tan.lengthSq() < 1e-10) _tan.set(0, 0, 1);
      _tan.normalize();
      _view.subVectors(camera.position, _p).normalize();
      _side.crossVectors(_tan, _view);
      if (_side.lengthSq() < 1e-8) _side.set(0, 1, 0);
      _side.normalize();

      const halfW = 0.7;
      const i = k * 2;
      hPos[i * 3] = _p.x + _side.x * halfW;
      hPos[i * 3 + 1] = _p.y + _side.y * halfW;
      hPos[i * 3 + 2] = _p.z + _side.z * halfW;
      hPos[(i + 1) * 3] = _p.x - _side.x * halfW;
      hPos[(i + 1) * 3 + 1] = _p.y - _side.y * halfW;
      hPos[(i + 1) * 3 + 2] = _p.z - _side.z * halfW;
      cPos[i * 3] = hPos[i * 3]!;
      cPos[i * 3 + 1] = hPos[i * 3 + 1]!;
      cPos[i * 3 + 2] = hPos[i * 3 + 2]!;
      cPos[(i + 1) * 3] = hPos[(i + 1) * 3]!;
      cPos[(i + 1) * 3 + 1] = hPos[(i + 1) * 3 + 1]!;
      cPos[(i + 1) * 3 + 2] = hPos[(i + 1) * 3 + 2]!;
    }

    (hazeGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
      true;
    hazeGeo.computeBoundingSphere();
    (coreGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
      true;
    coreGeo.computeBoundingSphere();
  });

  return (
    <>
      <mesh
        ref={hazeRef}
        geometry={hazeGeo}
        material={hazeMat}
        renderOrder={-800}
        frustumCulled={false}
      />
      <mesh
        ref={coreRef}
        geometry={coreGeo}
        material={coreMat}
        renderOrder={-799}
        frustumCulled={false}
      />
    </>
  );
}
