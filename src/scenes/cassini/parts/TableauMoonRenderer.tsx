// src/scenes/cassini/parts/TableauMoonRenderer.tsx
//
// All moon meshes pre-mount and stay mounted; per-frame damping picks
// which one is active instead of mount/unmount on every tableau swap.

import { useMissionStore } from "@/store/missionStore";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { getActiveTableau } from "../data/tableaus";
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

const BODY_RADIUS: Record<string, number> = {
  titan: 7.69,
  iapetus: 4.39,
  enceladus: 1.49,
  mimas: 1.19,
  rhea: 4.59,
  dione: 3.36,
  tethys: 3.31,
};

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
  const liveScaleRef = useRef(0);

  useEffect(() => {
    if (!groupRef.current) return;
    const t = useMissionStore.getState().currentT;
    const tab = getActiveTableau(t);
    const isActive =
      tab.kind === "moon" && tab.body === body && !!tab.moonEffectiveRadius;
    if (isActive) {
      const target = (tab.moonEffectiveRadius ?? 0) / realR;
      liveScaleRef.current = target;
      groupRef.current.scale.setScalar(Math.max(0.00001, target));
      groupRef.current.visible = target > 0.001;
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
      const isActive =
        tab.kind === "moon" && tab.body === body && !!tab.moonEffectiveRadius;
      const target = isActive ? (tab.moonEffectiveRadius ?? 0) / realR : 0;

      liveScaleRef.current = THREE.MathUtils.damp(
        liveScaleRef.current,
        target,
        4,
        delta,
      );
      if (!Number.isFinite(liveScaleRef.current)) liveScaleRef.current = target;
      groupRef.current.scale.setScalar(Math.max(0.00001, liveScaleRef.current));
      groupRef.current.visible = liveScaleRef.current > 0.001;
    } catch (err) {
      console.error(`[MoonMesh:${body} useFrame] swallowed error`, err);
    }
  });

  const showSpace = renderMode !== "blueprint";
  return (
    <group ref={groupRef} visible={false}>
      <mesh visible={showSpace}>
        <sphereGeometry args={[realR, 96, 48]} />
        <primitive object={spaceMaterialRef.current} attach="material" />
      </mesh>
      <mesh visible={!showSpace}>
        <sphereGeometry args={[realR, 96, 48]} />
        <primitive object={blueprintMaterialRef.current} attach="material" />
      </mesh>
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
