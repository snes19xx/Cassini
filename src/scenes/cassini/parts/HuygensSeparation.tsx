// src/scenes/cassini/parts/HuygensSeparation.tsx
//
// Huygens probe separation + descent animation. Mounts only during the
// Huygens descent portion of the Titan tableau and plays out as:
//
//   1. Probe spring-releases off Cassini
//   2. Probe falls toward Titan with accelerating ease
//   3. Probe fades out as it enters Titan's haze

import { useMissionStore } from "@/store/missionStore";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HUYGENS_SEPARATION_T } from "../data/missionConstants";
import { getActiveTableau } from "../data/tableaus";

const SEP_START = HUYGENS_SEPARATION_T;
const TOUCHDOWN = 0.395;
const FADE_END = 0.4;

// Sentinels for the selector below: outside the descent window it pins
// currentT to a constant, so zustand's Object.is check skips a re-render
// on every frame for the ~96% of the mission outside this tiny window.
const BEFORE_WINDOW = -1;
const AFTER_WINDOW = 2;

export function HuygensSeparation() {
  const currentT = useMissionStore((s) =>
    s.currentT < SEP_START
      ? BEFORE_WINDOW
      : s.currentT > FADE_END
        ? AFTER_WINDOW
        : s.currentT,
  );
  const { scene } = useGLTF("/assets/CassiniHuygensAwithout_Cassini.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const renderMode = useMissionStore((s) => s.renderMode);
  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
        if (renderMode === "blueprint") {
          child.material = new THREE.MeshBasicMaterial({
            color: "#8fd2ff",
            wireframe: true,
            transparent: true,
            opacity: 0.25,
          });
        } else if (renderMode === "editorial") {
          child.material = new THREE.MeshBasicMaterial({
            color: "#1a2026",
            wireframe: true,
            transparent: true,
            opacity: 0.85,
          });
        } else {
          child.material = child.userData.originalMaterial;
          child.material.transparent = true;
          child.material.opacity = 1.0;
        }
      }
    });
  }, [clonedScene, renderMode]);

  useFrame(() => {
    if (!groupRef.current) return;
    try {
      const t = useMissionStore.getState().currentT;

      // Fade after touchdown so the probe disappears into Titan's haze.
      if (t > TOUCHDOWN) {
        const fade = Math.max(
          0,
          1.0 - (t - TOUCHDOWN) / (FADE_END - TOUCHDOWN),
        );
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            (child.material as THREE.Material).transparent = true;
            (child.material as any).opacity = fade;
          }
        });
      } else {
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const isWire =
              renderMode === "blueprint" || renderMode === "editorial";
            (child.material as THREE.Material).transparent = isWire;
            (child.material as any).opacity = isWire
              ? renderMode === "editorial"
                ? 0.85
                : 0.25
              : 1.0;
          }
        });
      }
    } catch (err) {
      console.error("[HuygensSeparation useFrame] swallowed error", err);
    }
  });

  if (currentT === BEFORE_WINDOW || currentT === AFTER_WINDOW) return null;
  const tableau = getActiveTableau(currentT);
  if (tableau.id !== "titan_huygens") return null;

  const p = Math.min(
    1,
    Math.max(0, (currentT - SEP_START) / (TOUCHDOWN - SEP_START)),
  );

  const startOffset = tableau.cassiniOffset ?? [0, 0, 0];
  const fallEase = Math.pow(p, 2.2);
  const lateralBump = Math.sin(p * Math.PI) * 4.0;

  const position: [number, number, number] = [
    startOffset[0] * (1 - fallEase) + -lateralBump * 0.4,
    startOffset[1] * (1 - fallEase) - lateralBump * 0.6,
    startOffset[2] * (1 - fallEase) - lateralBump * 0.3,
  ];

  return (
    <group ref={groupRef} position={position}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload("/assets/CassiniHuygensAwithout_Cassini.glb");
