// Day-side fill light for terminal tableaus only, so the descent isn't into unlit void.

import { useEffect, useRef } from "react";
import * as THREE from "three";

const POSITION: [number, number, number] = [-150, 90, -380];
const INTENSITY = 1.8;
const COLOR = "#fff2e6";

export function TerminalSunFill() {
  const ref = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.layers.enable(0);
      ref.current.layers.enable(1);
    }
  }, []);

  return (
    <directionalLight
      ref={ref}
      position={POSITION}
      intensity={INTENSITY}
      color={COLOR}
    />
  );
}
