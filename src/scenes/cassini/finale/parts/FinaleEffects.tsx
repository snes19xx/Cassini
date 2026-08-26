// Fog overlay for the terminal descent. Density and color ramp with descent
// progress so the atmosphere thickens visibly as Cassini falls.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useMissionStore } from "../../../../store/missionStore";
import { getActiveTableau } from "../../data/tableaus";
import { ringDiveStateRef } from "../../Spacecraft";
import {
  getDescentProgress,
  getFinaleShot,
  isTerminalTableau,
} from "../lib/finaleDescent";
import { useMeteorDebugStore } from "../lib/meteorDebug";
import {
  getPlungeCassiniPos,
  getPlungeEndpoints,
} from "../lib/plungeTrajectory";

// Avoids allocating a THREE.Color pair every frame.
const _hazeHigh = new THREE.Color(0x6f7e92);
const _hazeLow = new THREE.Color(0xcfc6b2);

const _mUp = new THREE.Vector3();
const _mTravel = new THREE.Vector3();
const _mSide = new THREE.Vector3();
const _pEntry = new THREE.Vector3();
const _pExit = new THREE.Vector3();
const _pSeg = new THREE.Vector3();
const _proj = new THREE.Vector3();

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
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const cfg = sparkConfig(i, count);
        const slot = Math.min(
          1,
          Math.max(
            0,
            (i + 0.5) / count + ((cfg.emitJitter - 0.5) * 0.8) / count,
          ),
        );
        return { cfg, slot };
      }),
    [count],
  );

  return (
    <group>
      {sparks.map(({ cfg, slot }, i) => (
        <MeteorStreak key={i} cfg={cfg} slot={slot} />
      ))}
    </group>
  );
}

function MeteorStreak({ cfg, slot }: { cfg: SparkCfg; slot: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const fStartRef = useRef(-1);

  const initialPos = useMemo(() => {
    const v = new THREE.Vector3();
    getPlungeCassiniPos(useMissionStore.getState().currentT, v);
    return v;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const md = useMeteorDebugStore.getState();
    const P = ringDiveStateRef.position;
    const V = ringDiveStateRef.velocity;

    _mUp.copy(P).normalize();
    const vDotUp = V.dot(_mUp);
    _mTravel.copy(V).addScaledVector(_mUp, -vDotUp);
    if (_mTravel.lengthSq() > 1e-5) _mTravel.normalize();
    else _mTravel.set(0, 0, 1);
    _mSide.crossVectors(_mTravel, _mUp).normalize();

    // Route fraction of the live head, projected onto entry->exit.
    getPlungeEndpoints(_pEntry, _pExit);
    _pSeg.subVectors(_pExit, _pEntry);
    const segSq = _pSeg.lengthSq();
    let fNow =
      segSq > 1e-9 ? _proj.subVectors(P, _pEntry).dot(_pSeg) / segSq : 1;
    fNow = Math.min(1, Math.max(0, fNow));
    if (fStartRef.current < 0) fStartRef.current = fNow;
    const fStart = fStartRef.current;
    const segLen = Math.max(0.001, 1 - fStart);
    const emitLo = fStart + md.splitStart * segLen;
    const emitHi = fStart + 0.99 * segLen;
    const eF = emitLo + (emitHi - emitLo) * slot;

    if (fNow <= eF) {
      meshRef.current.position.copy(P);
      return;
    }

    // Each fragment anchors to the moving head and peels back + outward
    // with age
    const an = Math.min(1, (fNow - eF) / segLen);
    const open = Math.pow(an, md.burstEase);
    const back = an * cfg.lag * md.elongation * md.spread;
    const fanW = open * md.spread;
    const fall = md.gravity * an * an * md.spread;
    const waver =
      Math.sin(an * md.waverFreq * 6 + cfg.phase) * cfg.curl * md.waver * fanW;

    meshRef.current.position
      .copy(P)
      .addScaledVector(_mTravel, -back)
      .addScaledVector(_mSide, cfg.perp * fanW * md.fan + waver)
      .addScaledVector(_mUp, cfg.vert * fanW * md.fan * md.vBias - fall);
  });

  return (
    <mesh ref={meshRef} position={initialPos}>
      <sphereGeometry args={[0.5, 10, 10]} />
      <meshBasicMaterial color={cfg.core ? "#ffd9a0" : "#ff8850"} />
    </mesh>
  );
}
