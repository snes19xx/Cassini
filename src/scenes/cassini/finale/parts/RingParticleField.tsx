// Discrete icy chunks scattered across the ring annulus, visible at close range.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  PARTICLE_MAX_CAPACITY,
  useFinaleRingsStore,
} from "../lib/finaleRingsDebug";

const PARTICLE_RING_INNER = 222.5;
const PARTICLE_RING_OUTER = 419.3;
const SATURN_RADIUS = 180;

const RING_THICKNESS_HALF = 30;

const RING_ORBIT_SPEED = 0.05;

const SUN_DIR = new THREE.Vector3(-400, 80, 200).normalize();

const scratchMatrix = new THREE.Matrix4();
const scratchQuat = new THREE.Quaternion();
const scratchVecPos = new THREE.Vector3();
const scratchVecScl = new THREE.Vector3();

function saturnShadowFactor(x: number, y: number, z: number): number {
  const along = x * SUN_DIR.x + y * SUN_DIR.y + z * SUN_DIR.z;
  if (along > 0) return 1;
  const px = x - along * SUN_DIR.x;
  const py = y - along * SUN_DIR.y;
  const pz = z - along * SUN_DIR.z;
  const pd = Math.sqrt(px * px + py * py + pz * pz);
  if (pd < SATURN_RADIUS - 3) return 0;
  if (pd > SATURN_RADIUS + 3) return 1;
  return Math.max(0, Math.min(1, (pd - (SATURN_RADIUS - 3)) / 6));
}

export function RingParticleField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const fieldAngleRef = useRef(0);

  const particles = useMemo(() => {
    const N = PARTICLE_MAX_CAPACITY;
    const pos = new Float32Array(N * 3);
    const uRaw = new Float32Array(N);
    const rot = new Float32Array(N * 4);
    const tint = new Float32Array(N);
    const shade = new Float32Array(N);

    let seed = 1337;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    const innerSq = PARTICLE_RING_INNER * PARTICLE_RING_INNER;
    const outerSq = PARTICLE_RING_OUTER * PARTICLE_RING_OUTER;

    for (let i = 0; i < N; i++) {
      const r = Math.sqrt(rng() * (outerSq - innerSq) + innerSq);
      const az = rng() * Math.PI * 2;
      const x = r * Math.cos(az);
      const z = r * Math.sin(az);
      const y = (rng() - 0.5) * 2 * RING_THICKNESS_HALF;
      pos[i * 3 + 0] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      uRaw[i] = rng();

      const q = new THREE.Quaternion().random();
      rot[i * 4 + 0] = q.x;
      rot[i * 4 + 1] = q.y;
      rot[i * 4 + 2] = q.z;
      rot[i * 4 + 3] = q.w;

      tint[i] = rng();
      shade[i] = 0.35 + 0.65 * saturnShadowFactor(x, y, z);
    }

    return { pos, uRaw, rot, tint, shade };
  }, []);

  const scaleFor = (i: number, size: number, jitter: number): number =>
    size * (0.4 + particles.uRaw[i]! * particles.uRaw[i]! * (1 + jitter));

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  const partR = useFinaleRingsStore((s) => s.partR);
  const partG = useFinaleRingsStore((s) => s.partG);
  const partB = useFinaleRingsStore((s) => s.partB);
  const partBrightness = useFinaleRingsStore((s) => s.partBrightness);

  const paintColors = useMemo(() => {
    const baseCol = new THREE.Color();
    const darkCol = new THREE.Color();
    const scratchColor = new THREE.Color();
    return () => {
      if (!meshRef.current) return;
      baseCol.setRGB(partR, partG, partB).multiplyScalar(partBrightness);
      darkCol.copy(baseCol).multiplyScalar(0.58);
      for (let i = 0; i < PARTICLE_MAX_CAPACITY; i++) {
        scratchColor
          .copy(darkCol)
          .lerp(baseCol, particles.tint[i]!)
          .multiplyScalar(particles.shade[i]!);
        meshRef.current.setColorAt(i, scratchColor);
      }
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    };
  }, [particles, partR, partG, partB, partBrightness]);

  const partSize = useFinaleRingsStore((s) => s.partSize);
  const partJitter = useFinaleRingsStore((s) => s.partJitter);

  const paintMatrices = useMemo(() => {
    return () => {
      if (!meshRef.current) return;
      for (let i = 0; i < PARTICLE_MAX_CAPACITY; i++) {
        const ix = i * 3;
        const iq = i * 4;
        scratchVecPos.set(
          particles.pos[ix + 0]!,
          particles.pos[ix + 1]!,
          particles.pos[ix + 2]!,
        );
        const s = scaleFor(i, partSize, partJitter);
        scratchVecScl.set(s, s, s);
        scratchQuat.set(
          particles.rot[iq + 0]!,
          particles.rot[iq + 1]!,
          particles.rot[iq + 2]!,
          particles.rot[iq + 3]!,
        );
        scratchMatrix.compose(scratchVecPos, scratchQuat, scratchVecScl);
        meshRef.current.setMatrixAt(i, scratchMatrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particles, partSize, partJitter]);

  useEffect(() => {
    paintMatrices();
    if (meshRef.current) meshRef.current.layers.set(1);
  }, [paintMatrices]);

  useEffect(() => {
    paintColors();
  }, [paintColors]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const CAM_NEAR = 300;
  const CAM_FAR = 1500;

  useFrame(({ camera }) => {
    if (!meshRef.current) return;

    const dbg = useFinaleRingsStore.getState();
    meshRef.current.count = Math.max(
      0,
      Math.min(PARTICLE_MAX_CAPACITY, Math.round(dbg.partCount)),
    );

    const camDist = camera.position.length();
    const proximity = Math.max(
      0,
      Math.min(1, (CAM_FAR - camDist) / (CAM_FAR - CAM_NEAR)),
    );

    material.opacity = proximity * dbg.partOpacity;
    meshRef.current.visible = material.opacity > 0.01;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, PARTICLE_MAX_CAPACITY]}
      frustumCulled={false}
    />
  );
}
