// src/scenes/cassini/parts/SceneLighting.tsx
//
// Per-renderMode light rigs. Saturn opts into layer 1 (SaturnBody/SaturnRings
// call mesh.layers.set(1)) so it only receives the sun and a dim ambient in
// natural/rim modes, staying clear of the hemisphere/fill/rim lights that
// warm and tint the moons. FULL mode is the exception: it deliberately lights
// both layers from all sides.

import { useMissionStore } from "@/store/missionStore";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getActiveTableau } from "../data/tableaus";

// Sun position for the crescent-lit tableaus. Behind and below-left of the
// moons relative to the +Z camera so each body shows a thin blown-white
// crescent on its lower-left limb (PIA18322). Exported so
// TableauMoonRenderer's Titan haze shell can match it.
export const CRESCENT_SUN_POS: [number, number, number] = [-260, -160, -700];

export function SceneLighting({ renderMode }: { renderMode: string }) {
  const lightingMode = useMissionStore((s) => s.lightingMode);
  // Crescent tableaus swap the whole natural rig for a single backlit sun
  // and near-zero fill: night sides must read pure black against space, not
  // lifted grey.
  const crescent = useMissionStore(
    (s) => getActiveTableau(s.currentT).effects?.crescentLighting === true,
  );

  // SUN:
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const saturnAmbientRef = useRef<THREE.AmbientLight>(null);
  const fullAmbientRef = useRef<THREE.AmbientLight>(null);
  const fullKeyRef = useRef<THREE.DirectionalLight>(null);
  const fullFillRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    if (sunRef.current) {
      sunRef.current.layers.enable(0);
      sunRef.current.layers.enable(1);
    }
    if (saturnAmbientRef.current) {
      saturnAmbientRef.current.layers.set(1);
    }
    for (const ref of [fullAmbientRef, fullKeyRef, fullFillRef]) {
      if (ref.current) {
        ref.current.layers.enable(0);
        ref.current.layers.enable(1);
      }
    }
  }, [renderMode, lightingMode, crescent]);

  switch (renderMode) {
    case "space":
      if (crescent) {
        return (
          <>
            <directionalLight
              ref={sunRef}
              position={CRESCENT_SUN_POS}
              intensity={2.6}
              color="#ffffff"
            />
            <ambientLight intensity={0.03} color="#1a2040" />
            {lightingMode === "full" && (
              <>
                <ambientLight
                  ref={fullAmbientRef}
                  intensity={1.5}
                  color="#ffffff"
                />
                <directionalLight
                  ref={fullKeyRef}
                  position={[-400, 80, 200]}
                  intensity={1.2}
                  color="#ffffff"
                />
                <directionalLight
                  ref={fullFillRef}
                  position={[400, -80, -200]}
                  intensity={1.2}
                  color="#ffffff"
                />
              </>
            )}
          </>
        );
      }
      return (
        <>
          <directionalLight
            ref={sunRef}
            position={[-400, 80, 200]}
            intensity={1.7}
            color="#ffffff"
          />
          <directionalLight
            position={[100, -50, -100]}
            intensity={0.18}
            color="#a8b4c8"
          />
          <ambientLight intensity={0.12} color="#1a2040" />
          <hemisphereLight
            intensity={0.5}
            groundColor="#1a1a2e"
            color="#ffffff"
          />
          <ambientLight
            ref={saturnAmbientRef}
            intensity={0.08}
            color="#1a2040"
          />
          {lightingMode === "rim" && (
            <directionalLight
              position={[400, -80, -200]}
              intensity={0.85}
              color="#cfe6ff"
            />
          )}
          {lightingMode === "full" && (
            <>
              <ambientLight
                ref={fullAmbientRef}
                intensity={1.5}
                color="#ffffff"
              />
              <directionalLight
                ref={fullKeyRef}
                position={[-400, 80, 200]}
                intensity={1.2}
                color="#ffffff"
              />
              <directionalLight
                ref={fullFillRef}
                position={[400, -80, -200]}
                intensity={1.2}
                color="#ffffff"
              />
            </>
          )}
        </>
      );

    case "blueprint":
      return (
        <>
          <ambientLight intensity={0.85} color="#8fd2ff" />
          <directionalLight
            position={[0, 1, 0]}
            intensity={0.3}
            color="#dceafe"
          />
          {lightingMode === "rim" && (
            <directionalLight
              position={[0, -1, 0]}
              intensity={0.35}
              color="#dceafe"
            />
          )}
          {lightingMode === "full" && (
            <>
              <ambientLight intensity={1.2} color="#dceafe" />
              <directionalLight
                position={[0, -1, 0]}
                intensity={0.5}
                color="#dceafe"
              />
            </>
          )}
        </>
      );

    case "editorial":
      return (
        <>
          <ambientLight ref={fullAmbientRef} intensity={1.4} color="#ffffff" />
          <directionalLight
            ref={fullKeyRef}
            position={[-400, 80, 200]}
            intensity={0.9}
            color="#ffffff"
          />
          <directionalLight
            ref={fullFillRef}
            position={[400, -80, -200]}
            intensity={0.9}
            color="#ffffff"
          />
          <directionalLight
            position={[0, 400, 0]}
            intensity={0.4}
            color="#ffffff"
          />
        </>
      );

    default:
      return null;
  }
}
