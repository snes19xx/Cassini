// src/scenes/cassini/parts/CassiniHuygensA.tsx
//
// Full Cassini + Huygens model for the pre-separation phases, with mesh
// refs for live label anchor projection.

import { useGLTF } from "@react-three/drei";
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

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
  const clone = useMemo(() => scene.clone(), [scene]);

  const exported = useMemo(() => {
    const byMesh = new Map<THREE.Mesh, THREE.Material>();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        byMesh.set(child, child.material as THREE.Material);
      }
    });
    return byMesh;
  }, [clone]);

  useLayoutEffect(() => {
    for (const [mesh, material] of exported) {
      mesh.material = overrideMaterial ?? material;
    }
  }, [exported, overrideMaterial]);

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
