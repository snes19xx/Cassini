// Fog overlay for the terminal descent. Density and color ramp with descent
// progress so the atmosphere thickens visibly as Cassini falls.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useMissionStore } from "../../../../store/missionStore";
import { getActiveTableau } from "../../data/tableaus";
import { getDescentProgress, isTerminalTableau } from "../lib/finaleDescent";

// Hoisted: avoids allocating a THREE.Color pair every frame.
const _hazeHigh = new THREE.Color(0x6f7e92);
const _hazeLow = new THREE.Color(0xcfc6b2);

export function AtmosphericHaze() {
  const { scene } = useThree();
  const fogRef = useRef<THREE.FogExp2>(new THREE.FogExp2(0x556677, 0));

  useEffect(() => {
    const prevFog = scene.fog;
    scene.fog = fogRef.current;
    return () => {
      scene.fog = prevFog;
    };
  }, [scene]);

  useFrame(() => {
    const t = useMissionStore.getState().currentT;
    const tableau = getActiveTableau(t);

    if (!isTerminalTableau(tableau.id)) {
      fogRef.current.density = 0;
      return;
    }

    const p = getDescentProgress(t);
    const density = THREE.MathUtils.lerp(0.0006, 0.0032, p);
    fogRef.current.color.lerpColors(_hazeHigh, _hazeLow, p);
    fogRef.current.density = density;
  });

  return null;
}
