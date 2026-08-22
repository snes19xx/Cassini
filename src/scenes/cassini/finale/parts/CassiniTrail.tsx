// Cassini's terminal contrail. Renders two overlaid ribbon passes: a wide
// soft haze and a narrow bright core, just like the JPL video
// https://www.youtube.com/watch?v=xrGAQCq9BMU

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

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
