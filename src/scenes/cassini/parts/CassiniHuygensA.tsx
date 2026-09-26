// src/scenes/cassini/parts/CassiniHuygensA.tsx
//
// Full Cassini + Huygens model for the pre-separation phases, with mesh
// refs for live label anchor projection.

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const STUDIO_ENV_INTENSITY = 0.1;

const studioEnvs = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

function studioEnv(gl: THREE.WebGLRenderer): THREE.Texture {
  let env = studioEnvs.get(gl);
  if (!env) {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    studioEnvs.set(gl, env);
  }
  return env;
}

export interface CassiniAAnchors {
  bus: React.RefObject<THREE.Mesh>;
  hga: React.RefObject<THREE.Mesh>;
  huygens: React.RefObject<THREE.Mesh>;
  iss: React.RefObject<THREE.Mesh>;
  radar: React.RefObject<THREE.Mesh>;
}

// Label anchors, by GLB node name. Each must be a single-primitive mesh.
const ANCHOR_NODES: Record<keyof CassiniAAnchors, string> = {
  bus: "black_krinkle",
  hga: "dish",
  huygens: "foil_gold_h",
  iss: "foil_gold_2",
  radar: "plastic_white",
};

interface ModelProps extends React.ComponentPropsWithoutRef<"group"> {
  url?: string;
  anchorRefs?: CassiniAAnchors;
  overrideMaterial?: THREE.Material | null;
}

export function CassiniLabelHull({
  url = "/assets/CassiniHuygensA.glb",
  anchorRefs,
  overrideMaterial,
  ...props
}: ModelProps) {
  const { scene } = useGLTF(url);
  const gl = useThree((s) => s.gl);
  const clone = useMemo(() => scene.clone(), [scene]);

  // scene.clone() shares its materials with the useGLTF cache.
  const studioMaterials = useMemo(() => {
    const env = studioEnv(gl);
    const byOriginal = new Map<THREE.Material, THREE.Material>();
    const byMesh = new Map<THREE.Mesh, THREE.Material>();
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const original = child.material as THREE.Material;
      let lit = byOriginal.get(original);
      if (!lit) {
        lit = original.clone();
        if (lit instanceof THREE.MeshStandardMaterial) {
          lit.envMap = env;
          lit.envMapIntensity = STUDIO_ENV_INTENSITY;
        }
        byOriginal.set(original, lit);
      }
      byMesh.set(child, lit);
    });
    return byMesh;
  }, [clone, gl]);

  useEffect(
    () => () => {
      for (const material of new Set(studioMaterials.values())) {
        material.dispose();
      }
    },
    [studioMaterials],
  );

  useLayoutEffect(() => {
    for (const [mesh, material] of studioMaterials) {
      mesh.material = overrideMaterial ?? material;
    }
  }, [studioMaterials, overrideMaterial]);

  useLayoutEffect(() => {
    if (!anchorRefs) return;
    for (const key of Object.keys(ANCHOR_NODES) as (keyof CassiniAAnchors)[]) {
      const node = clone.getObjectByName(ANCHOR_NODES[key]);
      // The post-separation model has no probe.
      anchorRefs[key].current = (
        node instanceof THREE.Mesh ? node : null
      ) as THREE.Mesh;
    }
  }, [clone, anchorRefs]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clone} />
    </group>
  );
}

export function CassiniHuygensA(props: Omit<ModelProps, "url">) {
  return <CassiniLabelHull url="/assets/CassiniHuygensA.glb" {...props} />;
}

useGLTF.preload("/assets/CassiniHuygensA.glb");
