import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLiveLabelAnchors } from "../../hooks/useLiveLabelAnchors";
import type { AnchorPoint } from "../../hooks/useProjectedPoints";
import { useMissionStore } from "../../store/missionStore";
import { INSPECTION_VIEWS } from "./data/inspectionViews";
import { HUYGENS_SEPARATION_T } from "./data/missionConstants";
import { getActiveTableau } from "./data/tableaus";
import { stateAt } from "./lib/stateAt";
import { CassiniHuygensA, type CassiniAAnchors } from "./parts/CassiniHuygensA";
import { CassiniHuygensAwithoutHuygens } from "./parts/CassiniHuygensAwithoutHuygens";
import { HuygensSeparation } from "./parts/HuygensSeparation";
import { RingCrossingFlash } from "./parts/RingCrossingFlash";

export const labelAnchorsRef: React.MutableRefObject<AnchorPoint[]> = {
  current: [],
};

const EDITORIAL_MODEL_SCALE = 2.9;
const BLUEPRINT_MODEL_SCALE = 3.5;
const SPACE_MODEL_SCALE = 1;
const HOMEPAGE_T_EPSILON = 0.001;

function applyHeatingGlow(
  mesh: THREE.Mesh,
  amount: number,
  renderMode: string,
) {
  if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;

  const glowColors: Record<string, THREE.Color> = {
    space: new THREE.Color("#ff6600"),
    blueprint: new THREE.Color("#8fd2ff"),
    editorial: new THREE.Color("#c07040"),
  };
  const glowIntensities: Record<string, number> = {
    space: 6.0,
    blueprint: 2.5,
    editorial: 3.5,
  };

  const eased = Math.min(1, amount / 0.4);
  const color = glowColors[renderMode] || new THREE.Color("#ff6600");
  const intensity = glowIntensities[renderMode] || 6.0;
  mesh.material.emissive.copy(color);
  mesh.material.emissiveIntensity = eased * intensity;
  mesh.material.needsUpdate = true;
}

function applyOpacityErosion(mesh: THREE.Mesh, amount: number) {
  if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
  const phaseStart = 0.3,
    phaseEnd = 0.85;
  const p = Math.max(
    0,
    Math.min(1, (amount - phaseStart) / (phaseEnd - phaseStart)),
  );

  mesh.material.transparent = p > 0;
  mesh.material.opacity = 1.0 - p * 0.95;
}

function useThematicMaterials() {
  return useMemo(
    () => ({
      blueprint: new THREE.MeshBasicMaterial({
        color: "#8fd2ff",
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      }),
      editorial: new THREE.MeshBasicMaterial({
        color: "#1a2026",
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      }),
    }),
    [],
  );
}

function useCameraFraming(cameraResetNonce: number, showLabels: boolean) {
  const { camera, controls } = useThree() as any;
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);
  const inspectionView = useMissionStore((s) => s.inspectionView);
  const inspectionViewNonce = useMissionStore((s) => s.inspectionViewNonce);
  const prevResetNonceRef = useRef(cameraResetNonce);
  const prevLabelsRef = useRef(showLabels);
  const prevInspectionViewRef = useRef(inspectionView);
  const prevInspectionNonceRef = useRef(inspectionViewNonce);

  useEffect(() => {
    const performSnap = () => {
      try {
        let px: number, py: number, pz: number;
        let lx: number, ly: number, lz: number;

        // Inspection-view snap only applies on the homepage AND while
        // LABELS is on.
        const state = useMissionStore.getState();
        const currentT = state.currentT;
        const isHomepage = currentT < 0.001;
        if (inspectionView && isHomepage && state.showLabels) {
          const view = INSPECTION_VIEWS[inspectionView];
          [px, py, pz] = view.camera.pos;
          [lx, ly, lz] = view.camera.lookAt;
        } else {
          const tableau = getActiveTableau(currentT);
          [px, py, pz] = tableau.camera.pos;
          [lx, ly, lz] = tableau.camera.lookAt;
        }

        if (
          !Number.isFinite(px + py + pz + lx + ly + lz) ||
          (px === lx && py === ly && pz === lz)
        ) {
          return;
        }
        camera.position.set(px, py, pz);
        if (controls?.target) {
          controls.target.set(lx, ly, lz);
          controls.update?.();
        } else {
          camera.lookAt(lx, ly, lz);
        }
        camera.updateProjectionMatrix();
      } catch (err) {
        console.error("[performSnap] swallowed error", err);
      }
    };

    const isManual =
      cameraResetNonce !== prevResetNonceRef.current ||
      showLabels !== prevLabelsRef.current ||
      inspectionView !== prevInspectionViewRef.current ||
      inspectionViewNonce !== prevInspectionNonceRef.current;
    prevResetNonceRef.current = cameraResetNonce;
    prevLabelsRef.current = showLabels;
    prevInspectionViewRef.current = inspectionView;
    prevInspectionNonceRef.current = inspectionViewNonce;

    // Manual reset / labels toggle / inspection-view selection: snap
    // immediately so the user's click feels instant.
    if (isManual) {
      performSnap();
      return;
    }
    const handle = window.setTimeout(performSnap, 120);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tableauId,
    cameraResetNonce,
    showLabels,
    inspectionView,
    inspectionViewNonce,
  ]);
}

function DisplayModel({
  activeModel,
  renderMode,
  groupRef,
  materials,
  modelScale,
}: {
  activeModel: string;
  renderMode: string;
  groupRef: React.RefObject<THREE.Group>;
  materials: ReturnType<typeof useThematicMaterials>;
  modelScale: number;
}) {
  const { scene } = useGLTF(`/assets/${activeModel}`);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
          const original = child.userData.originalMaterial as THREE.Material;
          if (original instanceof THREE.MeshStandardMaterial) {
            if (original.metalness > 0.25) original.metalness = 0.25;
            original.envMapIntensity = 0.6;
          }
        }
        let target = child.userData.originalMaterial as THREE.Material;
        // Wireframe themes override every mesh with their respective
        // override material. Blueprint = pale-blue wireframe over deep
        // navy; editorial = dark wireframe over cream paper.
        if (renderMode === "blueprint") {
          target = materials.blueprint;
        }
        if (renderMode === "editorial") {
          target = materials.editorial;
        }
        child.material = target;
      }
    });
  }, [clonedScene, renderMode, activeModel, materials]);

  return (
    <group ref={groupRef} scale={modelScale}>
      <primitive object={clonedScene} />
    </group>
  );
}

function LabelModel({
  renderMode,
  groupRef,
  materials,
  huygensHasSeparated,
  modelScale,
}: {
  renderMode: string;
  groupRef: React.RefObject<THREE.Group>;
  materials: ReturnType<typeof useThematicMaterials>;
  huygensHasSeparated: boolean;
  modelScale: number;
}) {
  const anchorRefs: CassiniAAnchors = {
    bus: useRef<THREE.Mesh>(null!),
    hga: useRef<THREE.Mesh>(null!),
    huygens: useRef<THREE.Mesh>(null!),
    iss: useRef<THREE.Mesh>(null!),
    radar: useRef<THREE.Mesh>(null!),
  };

  const overrideMaterial = (() => {
    if (renderMode === "blueprint") return materials.blueprint;
    if (renderMode === "editorial") return materials.editorial;
    return null;
  })();

  const liveAnchors = useLiveLabelAnchors(anchorRefs, huygensHasSeparated);

  useFrame(() => {
    labelAnchorsRef.current = liveAnchors.current;
  });

  return (
    <group ref={groupRef} scale={modelScale}>
      {huygensHasSeparated ? (
        <CassiniHuygensAwithoutHuygens
          anchorRefs={anchorRefs}
          overrideMaterial={overrideMaterial}
        />
      ) : (
        <CassiniHuygensA
          anchorRefs={anchorRefs}
          overrideMaterial={overrideMaterial}
        />
      )}
    </group>
  );
}

export function Spacecraft() {
  const groupRef = useRef<THREE.Group>(null!);
  const activeModel = useMissionStore((s) => s.activeModel);
  const renderMode = useMissionStore((s) => s.renderMode);
  const cameraResetNonce = useMissionStore((s) => s.cameraResetNonce);
  const showLabels = useMissionStore((s) => s.showLabels);
  const currentT = useMissionStore((s) => s.currentT);
  const autoRotate = useMissionStore((s) => s.autoRotate);

  const huygensHasSeparated = currentT >= HUYGENS_SEPARATION_T;

  // Post-separation: swap the full-stack model for the Cassini-only
  // model so the disconnected Huygens probe doesn't remain attached.
  // Only applies when LABELS are off — labels mode uses a dedicated
  // <LabelModel> with its own with/without variant logic.
  let actualModel = activeModel;
  if (!showLabels && activeModel === "CassiniHuygensA.glb") {
    if (huygensHasSeparated) {
      actualModel = "CassiniHuygensAwithoutHyugens.glb";
    }
  }

  const materials = useThematicMaterials();

  // Homepage scale gate. Per-theme constants live at the top of this
  // file (EDITORIAL_MODEL_SCALE, BLUEPRINT_MODEL_SCALE, SPACE_MODEL_SCALE).
  // The scale only applies while:
  //   * currentT < HOMEPAGE_T_EPSILON (user hasn't pressed PLAY yet), AND
  //   * labels are off (inspection-view framing assumes scale 1).
  // Outside that window we it;s always rendered at scale 1 so cruise / Saturn /
  // Titan / inspection cameras stay tuned for the native model size.
  const isHomepage = currentT < HOMEPAGE_T_EPSILON;
  const themeScale =
    renderMode === "editorial"
      ? EDITORIAL_MODEL_SCALE
      : renderMode === "blueprint"
        ? BLUEPRINT_MODEL_SCALE
        : SPACE_MODEL_SCALE;
  const modelScale = isHomepage && !showLabels ? themeScale : 1;

  useCameraFraming(cameraResetNonce, showLabels);

  const targetPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const livePosRef = useRef(new THREE.Vector3(0, 0, 0));
  // A continuous wall-clock accumulator drives a tiny bob/yaw so Cassini
  // never reads as frozen
  const driftClockRef = useRef(0);

  // JUMP-TO / RESET: snap Cassini's live position to the active tableau's
  // target so it's already in place when the curtain lifts
  useEffect(() => {
    const t = useMissionStore.getState().currentT;
    const tableau = getActiveTableau(t);
    if (tableau.cassiniOffset) {
      livePosRef.current.set(
        tableau.cassiniOffset[0],
        tableau.cassiniOffset[1],
        tableau.cassiniOffset[2],
      );
    } else {
      livePosRef.current.set(0, 0, 0);
    }
  }, [cameraResetNonce]);

  useFrame((_, deltaRaw) => {
    if (!groupRef.current) return;
    // Clamp delta: when the tab backgrounds, requestAnimationFrame skips
    // and the next frame can deliver a multi-second delta.
    const delta = Number.isFinite(deltaRaw)
      ? Math.min(0.1, Math.max(0, deltaRaw))
      : 0;
    try {
      const t = useMissionStore.getState().currentT;
      const state = stateAt(t);
      const tableau = getActiveTableau(t);
      groupRef.current.rotation.copy(state.orientation);

      const disintegrationAmount = state.effects.disintegration || 0;

      // Resolve target from the active tableau. saturn_arrival defines
      // a cassiniOffset for its chase-cam framing, so honour it on any
      // tableau kind — falling back to origin only when no offset exists.
      if (tableau.cassiniOffset) {
        targetPosRef.current.set(
          tableau.cassiniOffset[0],
          tableau.cassiniOffset[1],
          tableau.cassiniOffset[2],
        );
      } else {
        targetPosRef.current.set(0, 0, 0);
      }

      if (disintegrationAmount > 0.85) {
        // Grand-finale tumble: ignore tableau target and shake.
        const finalP = (disintegrationAmount - 0.85) / 0.15;
        groupRef.current.rotation.x += delta * finalP * 5.0;
        groupRef.current.rotation.z += delta * finalP * 3.5;
        groupRef.current.position.set(
          (Math.random() - 0.5) * finalP * 0.4,
          (Math.random() - 0.5) * finalP * 0.4,
          0,
        );
        livePosRef.current.copy(groupRef.current.position);
      } else {
        // Damp the live position toward the tableau target.
        const live = livePosRef.current;
        const target = targetPosRef.current;
        live.x = THREE.MathUtils.damp(live.x, target.x, 2.4, delta);
        live.y = THREE.MathUtils.damp(live.y, target.y, 2.4, delta);
        live.z = THREE.MathUtils.damp(live.z, target.z, 2.4, delta);
        if (!Number.isFinite(live.x)) live.x = target.x;
        if (!Number.isFinite(live.y)) live.y = target.y;
        if (!Number.isFinite(live.z)) live.z = target.z;

        // Homepage gate: when the user is on the start screen
        const homepageStill = currentT < HOMEPAGE_T_EPSILON && !autoRotate;

        if (showLabels || homepageStill) {
          // Stillness branch: Cassini sits at the damped target with no
          // procedural drift. Drift and bob both suppressed.
          groupRef.current.position.copy(live);
        } else {
          // Perpetual drift
          // A wall-clock accumulator drives an always-on parallax orbit so
          // Cassini is never frozen - even during cruise (when the tableau
          // target is just origin and the spacecraft would otherwise sit
          // perfectly still).
          driftClockRef.current += delta;
          const c = driftClockRef.current;
          let driftAmp = 0;
          let driftSpeed = 1;
          if (tableau.kind === "cruise") {
            driftAmp = 6.5;
            driftSpeed = 0.18;
          } else if (
            tableau.kind === "saturn_focus" ||
            tableau.kind === "finale"
          ) {
            driftAmp = 3.5;
            driftSpeed = 0.22;
          } else {
            driftAmp = 0.55;
            driftSpeed = 0.55;
          }
          const driftX = Math.sin(c * driftSpeed) * driftAmp;
          const driftY = Math.sin(c * driftSpeed * 0.7 + 1.7) * driftAmp * 0.45;
          const driftZ = Math.cos(c * driftSpeed * 0.85 + 0.9) * driftAmp * 0.7;
          // Tiny bob preserved on top so even paused/zoomed-out moon scenes
          // have small micro-motion.
          const bobX = Math.sin(c * 0.6) * 0.08;
          const bobY = Math.sin(c * 0.45 + 1.7) * 0.06;
          const bobZ = Math.cos(c * 0.5 + 0.9) * 0.05;
          groupRef.current.position.set(
            live.x + driftX + bobX,
            live.y + driftY + bobY,
            live.z + driftZ + bobZ,
          );
        }
      }

      if (disintegrationAmount >= 1.0) {
        groupRef.current.visible = false;
      } else {
        groupRef.current.visible = true;
      }

      if (disintegrationAmount > 0) {
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            applyHeatingGlow(child, disintegrationAmount, renderMode);
            applyOpacityErosion(child, disintegrationAmount);
          }
        });
      } else {
        groupRef.current.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshStandardMaterial
          ) {
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.emissiveIntensity = 0.0;
          }
        });
      }
    } catch (err) {
      // Don't let a single bad frame tear the canvas down; surface to the
      // console so it can be diagnosed but keep playing.
      console.error("[Spacecraft useFrame] swallowed error", err);
    }
  });

  if (showLabels) {
    return (
      <group>
        <LabelModel
          renderMode={renderMode}
          groupRef={groupRef}
          materials={materials}
          huygensHasSeparated={huygensHasSeparated}
          modelScale={modelScale}
        />
        <HuygensSeparation currentT={currentT} />
        <RingCrossingFlash />
      </group>
    );
  }

  return (
    <group>
      <DisplayModel
        activeModel={actualModel}
        renderMode={renderMode}
        groupRef={groupRef}
        materials={materials}
        modelScale={modelScale}
      />
      {activeModel !== "CassiniHuygensAwithout_Cassini.glb" &&
        activeModel !== "CassiniHuygensAwithoutHyugens.glb" && (
          <HuygensSeparation currentT={currentT} />
        )}
      <RingCrossingFlash />
    </group>
  );
}

// Module-level preload for every shipping GLB.
useGLTF.preload("/assets/CassiniHuygensA.glb");
useGLTF.preload("/assets/CassiniHuygensAwithout_Cassini.glb");
useGLTF.preload("/assets/CassiniHuygensAwithoutHyugens.glb");
