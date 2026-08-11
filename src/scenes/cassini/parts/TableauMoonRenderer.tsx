// src/scenes/cassini/parts/TableauMoonRenderer.tsx
//
// All moon meshes pre-mount and stay mounted; per-frame damping picks
// which one is active instead of mount/unmount on every tableau swap.

import { useMissionStore } from "@/store/missionStore";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { getActiveTableau, type Tableau } from "../data/tableaus";
import {
  ALL_MOONS,
  Binding,
  MoonId,
  getBinding,
  subscribe,
} from "../lib/textureService";

// World position of every currently visible tableau moon, written each
// frame by its MoonMesh. Labels Projector reads this for multi-moon
// tableau tracking.
export const moonWorldPositions: Map<string, THREE.Vector3> = new Map();

interface MoonTarget {
  scale: number;
  px: number;
  py: number;
  pz: number;
  tiltRad: number;
  spinRadPerSec: number;
}

const BODY_RADIUS: Record<string, number> = {
  titan: 7.69,
  iapetus: 4.39,
  enceladus: 1.49,
  mimas: 1.19,
  rhea: 4.59,
  dione: 3.36,
  tethys: 3.31,
};

// Stylized speed-up on the true (tidally-locked) rotation periods, same
// trick as SaturnBody's 600x/1200x — real periods read as static.
const MOON_SPIN_FACTOR = 3000;

// Single-body tableaus put the focal moon at the origin; multi-moon
// tableaus (the group-portrait scenes) read each moon's own placement.
function resolveMoonTarget(
  tab: Tableau,
  body: string,
  realR: number,
): MoonTarget | null {
  if (tab.kind !== "moon") return null;
  if (tab.body === body && tab.moonEffectiveRadius) {
    return {
      scale: tab.moonEffectiveRadius / realR,
      px: 0,
      py: 0,
      pz: 0,
      tiltRad: 0,
      spinRadPerSec: 0,
    };
  }
  const placement = tab.moons?.find((m) => m.body === body);
  if (placement) {
    const baseRate = placement.spinPeriodHours
      ? (2 * Math.PI) / (placement.spinPeriodHours * 3600)
      : 0;
    return {
      scale: placement.effectiveRadius / realR,
      px: placement.pos[0],
      py: placement.pos[1],
      pz: placement.pos[2],
      tiltRad: ((placement.axialTiltDeg ?? 0) * Math.PI) / 180,
      spinRadPerSec: baseRate * MOON_SPIN_FACTOR,
    };
  }
  return null;
}

function useMoonBinding(body: MoonId): Binding {
  return useSyncExternalStore(
    (fn) => subscribe(body, fn),
    () => getBinding(body),
    () => getBinding(body),
  );
}

function MoonMesh({ body, renderMode }: { body: MoonId; renderMode: string }) {
  const cameraResetNonce = useMissionStore((s) => s.cameraResetNonce);

  const binding = useMoonBinding(body);
  const spaceMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const blueprintMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  if (!spaceMaterialRef.current) {
    spaceMaterialRef.current = new THREE.MeshStandardMaterial({
      color: "#9aa0a8",
      roughness: 0.78,
      metalness: 0.0,
    });
  }
  if (!blueprintMaterialRef.current) {
    blueprintMaterialRef.current = new THREE.MeshBasicMaterial({
      color: "#8fd2ff",
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
  }
  useEffect(() => {
    const m = spaceMaterialRef.current;
    if (!m) return;
    const hadMap = m.map !== null;
    const willHaveMap = binding.texture !== null;
    if (binding.texture) {
      m.map = binding.texture;
      m.color.set("#ffffff");
    } else {
      m.map = null;
      m.color.set("#9aa0a8");
    }
    if (hadMap !== willHaveMap) {
      m.needsUpdate = true;
    }
  }, [binding]);

  const realR = BODY_RADIUS[body] ?? 5;
  const groupRef = useRef<THREE.Group>(null);
  // tilt (axial lean) wraps spin (rotation about that tilted axis) — two
  // nested groups keep the spin axis unambiguous.
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const liveScaleRef = useRef(0);
  const livePosRef = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!groupRef.current) return;
    const t = useMissionStore.getState().currentT;
    const tab = getActiveTableau(t);
    const target = resolveMoonTarget(tab, body, realR);
    if (target) {
      liveScaleRef.current = target.scale;
      livePosRef.current.set(target.px, target.py, target.pz);
      groupRef.current.scale.setScalar(Math.max(0.00001, target.scale));
      groupRef.current.position.copy(livePosRef.current);
      groupRef.current.visible = target.scale > 0.001;
    } else {
      liveScaleRef.current = 0;
      groupRef.current.scale.setScalar(0.00001);
      groupRef.current.visible = false;
    }
    // eslint-disable-next-line react-hooks
  }, [cameraResetNonce]);

  useFrame((_, deltaRaw) => {
    if (!groupRef.current) return;
    const delta = Number.isFinite(deltaRaw)
      ? Math.min(0.1, Math.max(0, deltaRaw))
      : 0;
    try {
      const t = useMissionStore.getState().currentT;
      const tab = getActiveTableau(t);
      const target = resolveMoonTarget(tab, body, realR);
      const targetScale = target ? target.scale : 0;

      liveScaleRef.current = THREE.MathUtils.damp(
        liveScaleRef.current,
        targetScale,
        4,
        delta,
      );
      if (!Number.isFinite(liveScaleRef.current)) {
        liveScaleRef.current = targetScale;
      }

      if (target) {
        const lp = livePosRef.current;
        if (liveScaleRef.current < 0.001) {
          lp.set(target.px, target.py, target.pz);
        } else {
          lp.x = THREE.MathUtils.damp(lp.x, target.px, 3.5, delta);
          lp.y = THREE.MathUtils.damp(lp.y, target.py, 3.5, delta);
          lp.z = THREE.MathUtils.damp(lp.z, target.pz, 3.5, delta);
          if (!Number.isFinite(lp.x + lp.y + lp.z)) {
            lp.set(target.px, target.py, target.pz);
          }
        }
        groupRef.current.position.copy(lp);
      }

      groupRef.current.scale.setScalar(Math.max(0.00001, liveScaleRef.current));
      groupRef.current.visible = liveScaleRef.current > 0.001;

      if (groupRef.current.visible && tab.moons) {
        let anchor = moonWorldPositions.get(body);
        if (!anchor) {
          anchor = new THREE.Vector3();
          moonWorldPositions.set(body, anchor);
        }
        anchor.copy(groupRef.current.position);
      } else if (moonWorldPositions.has(body)) {
        moonWorldPositions.delete(body);
      }

      // Tilt snaps (never on-screen mid-change); spin accumulates and
      // simply freezes in tableaus without a rate.
      if (tiltRef.current) {
        const tilt = target ? target.tiltRad : 0;
        if (tiltRef.current.rotation.z !== tilt) {
          tiltRef.current.rotation.z = tilt;
        }
      }
      if (spinRef.current && target && target.spinRadPerSec > 0) {
        spinRef.current.rotation.y += delta * target.spinRadPerSec;
      }
    } catch (err) {
      console.error(`[MoonMesh:${body} useFrame] swallowed error`, err);
    }
  });

  const showSpace = renderMode !== "blueprint";
  return (
    <group ref={groupRef} visible={false}>
      <group ref={tiltRef}>
        <group ref={spinRef}>
          <mesh visible={showSpace}>
            <sphereGeometry args={[realR, 96, 48]} />
            <primitive object={spaceMaterialRef.current} attach="material" />
          </mesh>
          <mesh visible={!showSpace}>
            <sphereGeometry args={[realR, 96, 48]} />
            <primitive
              object={blueprintMaterialRef.current}
              attach="material"
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function TableauMoonRenderer({ renderMode }: { renderMode: string }) {
  return (
    <>
      {ALL_MOONS.map((body) => (
        <MoonMesh key={body} body={body} renderMode={renderMode} />
      ))}
    </>
  );
}
