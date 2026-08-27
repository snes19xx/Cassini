// src/scenes/cassini/parts/CassiniHuygensA.tsx
//
// Full Cassini + Huygens model for the pre-separation phases, with mesh
// refs for live label anchor projection.

import { useGLTF } from "@react-three/drei";
import React, { useEffect } from "react";
import * as THREE from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    _root: THREE.Mesh;
    aluminum: THREE.Mesh;
    black_krinkle: THREE.Mesh;
    dish: THREE.Mesh;
    foil_gold: THREE.Mesh;
    foil_gold_2: THREE.Mesh;
    foil_gold_h: THREE.Mesh;
    plastic_dark: THREE.Mesh;
    plastic_white: THREE.Mesh;
    tex_01: THREE.Mesh;
    tex_01_h: THREE.Mesh;
  };
  materials: {
    aluminum: THREE.MeshStandardMaterial;
    black_krinkle: THREE.MeshStandardMaterial;
    dish_AO: THREE.MeshStandardMaterial;
    foil_gold: THREE.MeshStandardMaterial;
    foil_gold_2: THREE.MeshStandardMaterial;
    plastic_dark: THREE.MeshStandardMaterial;
    plastic_white: THREE.MeshStandardMaterial;
    tex_01: THREE.MeshStandardMaterial;
  };
};

export interface CassiniAAnchors {
  bus: React.RefObject<THREE.Mesh>;
  hga: React.RefObject<THREE.Mesh>;
  huygens: React.RefObject<THREE.Mesh>;
  iss: React.RefObject<THREE.Mesh>;
  radar: React.RefObject<THREE.Mesh>;
}

interface ModelProps extends React.ComponentPropsWithoutRef<"group"> {
  anchorRefs?: CassiniAAnchors;
  overrideMaterial?: THREE.Material | null;
}

export function CassiniHuygensA({
  anchorRefs,
  overrideMaterial,
  ...props
}: ModelProps) {
  const { nodes, materials } = useGLTF(
    "/assets/CassiniHuygensA.glb",
  ) as unknown as GLTFResult;

  // Clamp metalness: with no env map, metallic surfaces have nothing to
  // reflect but direct light, which clips to white under boosted sun.
  useEffect(() => {
    Object.values(materials).forEach((m) => {
      if (m instanceof THREE.MeshStandardMaterial) {
        if (m.metalness > 0.25) m.metalness = 0.25;
        m.envMapIntensity = 0.6;
      }
    });
  }, [materials]);

  const mat = (original: THREE.Material) => overrideMaterial ?? original;

  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes._root.geometry}
        material={mat(nodes._root.material as THREE.Material)}
      >
        <mesh
          geometry={nodes.aluminum.geometry}
          material={mat(materials.aluminum)}
          position={[-0.009, -2.44, -4.66]}
          scale={0.5}
        />
        <mesh
          ref={anchorRefs?.bus}
          geometry={nodes.black_krinkle.geometry}
          material={mat(materials.black_krinkle)}
          position={[-0.489, -0.743, 0]}
          scale={0.5}
        />
        <mesh
          ref={anchorRefs?.hga}
          geometry={nodes.dish.geometry}
          material={mat(materials.dish_AO)}
          position={[0.002, 1.932, -0.101]}
          scale={0.5}
        />
        <mesh
          geometry={nodes.foil_gold.geometry}
          material={mat(materials.foil_gold)}
          position={[0.083, -0.721, -4.587]}
          scale={0.5}
        />
        <mesh
          ref={anchorRefs?.iss}
          geometry={nodes.foil_gold_2.geometry}
          material={mat(materials.foil_gold_2)}
          position={[0.067, 0.624, 0.06]}
          scale={0.5}
        />
        <mesh
          ref={anchorRefs?.huygens}
          geometry={nodes.foil_gold_h.geometry}
          material={mat(materials.foil_gold)}
          position={[0.072, -0.721, -4.587]}
          scale={0.5}
        />
        <mesh
          geometry={nodes.plastic_dark.geometry}
          material={mat(materials.plastic_dark)}
          position={[-0.284, -0.873, 0]}
          scale={0.5}
        />
        <mesh
          ref={anchorRefs?.radar}
          geometry={nodes.plastic_white.geometry}
          material={mat(materials.plastic_white)}
          position={[0, 1.143, 0]}
          scale={0.5}
        />
        <mesh
          geometry={nodes.tex_01.geometry}
          material={mat(materials.tex_01)}
          scale={0.5}
        />
        <mesh
          geometry={nodes.tex_01_h.geometry}
          material={mat(materials.tex_01)}
          position={[-0.011, 0, 0]}
          scale={0.5}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload("/assets/CassiniHuygensA.glb");
