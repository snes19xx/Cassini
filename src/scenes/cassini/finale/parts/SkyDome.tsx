// Inward-facing sphere gradient for the terminal "inside the atmosphere" tableaus.

import { useEffect, useMemo } from "react";
import * as THREE from "three";

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vDir = normalize(wp.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vDir;
  void main() {
    float elev = clamp(vDir.y, -1.0, 1.0);

    vec3 skyHorizon = vec3(0.72, 0.76, 0.80);
    vec3 skyMid     = vec3(0.34, 0.46, 0.60);
    vec3 skyZenith  = vec3(0.07, 0.13, 0.24);
    vec3 sky = mix(skyHorizon, skyMid, smoothstep(0.0, 0.30, elev));
    sky = mix(sky, skyZenith, smoothstep(0.30, 1.0, elev));

    vec3 groundNear = vec3(0.74, 0.69, 0.57);
    vec3 groundFar  = vec3(0.50, 0.46, 0.39);
    float d = clamp(-elev, 0.0, 1.0);
    vec3 ground = mix(groundNear, groundFar, smoothstep(0.0, 0.5, d));

    vec3 col = elev >= 0.0 ? sky : ground;

    float band = smoothstep(0.10, 0.0, abs(elev));
    col = mix(col, vec3(0.90, 0.88, 0.82), band * 0.7);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SkyDome() {
  const geometry = useMemo(() => new THREE.SphereGeometry(6000, 48, 24), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      renderOrder={-1000}
      frustumCulled={false}
    />
  );
}
