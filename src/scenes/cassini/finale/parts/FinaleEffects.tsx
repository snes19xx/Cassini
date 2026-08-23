// Fog overlay for the terminal descent. Density and color ramp with descent
// progress so the atmosphere thickens visibly as Cassini falls.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useMissionStore } from "../../../../store/missionStore";
import { getActiveTableau } from "../../data/tableaus";
import {
  getDescentProgress,
  getFinaleShot,
  isTerminalTableau,
} from "../lib/finaleDescent";
import { useMeteorDebugStore } from "../lib/meteorDebug";
import { getPlungeCassiniPos } from "../lib/plungeTrajectory";

// Avoids allocating a THREE.Color pair every frame.
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

interface SparkCfg {
  core: boolean; // core spine vs shower spark
  lag: number; // trail distance behind head
  perp: number; // horizontal fan direction, -1..1
  vert: number; // vertical fan direction, -1..1
  width: number; // base width, core thicker
  warm: number; // warmth bias, 0-1
  emitJitter: number; // shed-point jitter along route
  phase: number; // waver phase offset
  curl: number; // signed waver amplitude
}

function sparkConfig(i: number, total: number): SparkCfg {
  let s = (i * 2654435761 + 0x9e3779b9) >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  // First 30% form a tight, bright core spine (the dense contrail right
  // behind the head). The rest are shower sparks that shear into the fan.
  const core = i / total < 0.3;

  return {
    core,
    lag: core ? 0.08 + rnd() * 0.12 : 0.5 + rnd() * 1.5,
    perp: core ? rnd() * 0.3 - 0.15 : rnd() * 2 - 1,
    vert: core ? rnd() * 0.3 - 0.15 : rnd() * 2 - 1,
    width: core ? 1.6 + rnd() * 1.2 : 0.25 + rnd() * 0.6,
    warm: rnd(),
    emitJitter: rnd(),
    phase: rnd() * Math.PI * 2,
    curl: core ? rnd() * 0.15 : rnd() * 2 - 1,
  };
}

export function CassiniMeteor() {
  const inMeteor = useMissionStore((s) => {
    const tb = getActiveTableau(s.currentT);
    if (!isTerminalTableau(tb.id)) return false;
    return getFinaleShot(getDescentProgress(s.currentT)).shot === "meteor";
  });
  if (!inMeteor) return null;
  return <MeteorShower />;
}

function MeteorShower() {
  const count = useMeteorDebugStore((s) => s.count);
  const configs = useMemo(
    () => Array.from({ length: count }, (_, i) => sparkConfig(i, count)),
    [count],
  );

  return (
    <group>
      {configs.map((cfg, i) => (
        <MeteorStreak key={i} cfg={cfg} />
      ))}
    </group>
  );
}

function MeteorStreak({ cfg }: { cfg: SparkCfg }) {
  const initialPos = useMemo(() => {
    const v = new THREE.Vector3();
    getPlungeCassiniPos(useMissionStore.getState().currentT, v);
    return v;
  }, []);

  return (
    <mesh position={initialPos}>
      <sphereGeometry args={[0.5, 10, 10]} />
      <meshBasicMaterial color={cfg.core ? "#ffd9a0" : "#ff8850"} />
    </mesh>
  );
}
