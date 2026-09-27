import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLiveLabelAnchors } from "../../hooks/useLiveLabelAnchors";
import type { AnchorPoint } from "../../hooks/useProjectedPoints";
import { useMissionStore, type ActiveModel } from "../../store/missionStore";
import { INSPECTION_VIEWS } from "./data/inspectionViews";
import {
  HUYGENS_SEPARATION_T,
  isOrbitalTableau,
  isTerminalTableau,
} from "./data/missionConstants";
import { DEFAULT_TABLEAU_FOV, getActiveTableau } from "./data/tableaus";
import { useCameraDebugStore } from "./finale/lib/cameraDebug";
import {
  ORBITAL_MODEL_SCALE,
  WIDE_MODEL_SCALE,
} from "./finale/lib/finaleOrbit";
import { useCassiniDebugStore } from "./finale/lib/cassiniDebug";
import { getPlungeSample } from "./finale/lib/plungeTrajectory";
import {
  getDescentProgress,
  getFinaleShot,
} from "./finale/lib/finaleDescent";
import {
  getRingDiveCassiniPos,
  getRingDiveSample,
} from "./finale/lib/ringDiveTrajectory";
import {
  getSwingAroundCassiniPos,
  getSwingAroundSample,
} from "./finale/lib/swingAroundTrajectory";
import { cassiniWorldPos } from "./lib/cassiniAnchor";
import { isArrivalTableau } from "./arrival/lib/arrivalShot";
import { orientationAt } from "./lib/orientationAt";
import { stateAt } from "./lib/stateAt";
import { traverseCassiniPos } from "./lib/traverseShot";
import { getTraverseProgress } from "./lib/useTransitionStore";
import { CassiniHuygensA, type CassiniAAnchors } from "./parts/CassiniHuygensA";
import { CassiniHuygensAwithoutHuygens } from "./parts/CassiniHuygensAwithoutHuygens";
import { HuygensSeparation } from "./parts/HuygensSeparation";
import { RingCrossingFlash } from "./parts/RingCrossingFlash";

export const labelAnchorsRef: React.MutableRefObject<AnchorPoint[]> = {
  current: [],
};

export const ringDiveStateRef = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(1, 0, 0),
};

const EDITORIAL_MODEL_SCALE = 2.9;
const BLUEPRINT_MODEL_SCALE = 3.5;
const SPACE_MODEL_SCALE = 2.5;
const HOMEPAGE_T_EPSILON = 0.001;

export const MOON_TABLEAU_SCALE = 0.17;

const HEAT_RED = new THREE.Color("#ff2a00");
const HEAT_ORANGE = new THREE.Color("#ff6600");
const HEAT_YELLOW = new THREE.Color("#ffc83c");
const HEAT_WHITE = new THREE.Color("#fff4e8");
const HEAT_BLUE = new THREE.Color("#8fd2ff");
export const HULL_GROUP_NAME = "cassiniHull";

// foil_gold's base colour in the GLB.
const GOLD_SHINE = new THREE.Color(1.0, 0.66, 0.08);
const GOLD_SHINE_INTENSITY = 0.6;
// Bounding radius of the hull GLB, model units
const HULL_RADIUS = 12;
const SHINE_FULL_BELOW = 0.06;
const SHINE_GONE_ABOVE = 0.15;

const _heatScratch = new THREE.Color();

function applyHeatingGlow(
  mesh: THREE.Mesh,
  amount: number,
  renderMode: string,
) {
  if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;

  const h = Math.min(1, Math.max(0, amount));
  let intensity: number;
  if (renderMode === "blueprint") {
    _heatScratch.copy(HEAT_BLUE);
    intensity = h * 1.0;
  } else {
    if (h < 0.33) {
      _heatScratch.copy(HEAT_RED).lerp(HEAT_ORANGE, h / 0.33);
    } else if (h < 0.66) {
      _heatScratch.copy(HEAT_ORANGE).lerp(HEAT_YELLOW, (h - 0.33) / 0.33);
    } else {
      _heatScratch.copy(HEAT_YELLOW).lerp(HEAT_WHITE, (h - 0.66) / 0.34);
    }
    intensity = h < 0.75 ? h * 1.3 : 0.975 + ((h - 0.75) / 0.25) * 4.0;
  }
  mesh.material.emissive.copy(_heatScratch);
  mesh.material.emissiveIntensity = intensity;
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
  const inspectionView = useMissionStore((s) => s.inspectionView);
  const inspectionViewNonce = useMissionStore((s) => s.inspectionViewNonce);

  useEffect(() => {
    const performSnap = () => {
      try {
        let px: number, py: number, pz: number;
        let lx: number, ly: number, lz: number;
        let fov = DEFAULT_TABLEAU_FOV;

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
          fov = tableau.camera.fov ?? DEFAULT_TABLEAU_FOV;
        }

        if (
          !Number.isFinite(px + py + pz + lx + ly + lz) ||
          (px === lx && py === ly && pz === lz)
        ) {
          return;
        }
        camera.position.set(px, py, pz);
        if (camera instanceof THREE.PerspectiveCamera && camera.fov !== fov) {
          camera.fov = fov;
        }
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

    performSnap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cameraResetNonce,
    showLabels,
    inspectionView,
    inspectionViewNonce,
  ]);
}

// Untextured copies for the wireframe themes
const GEO_MODELS: Partial<Record<ActiveModel, string>> = {
  "CassiniHuygensA.glb": "CassiniHuygensA_geo.glb",
  "CassiniHuygensAwithoutHyugens.glb": "CassiniHuygensAwithoutHyugens_geo.glb",
};

function DisplayModel({
  activeModel,
  materialMode,
  groupRef,
  materials,
  modelScale,
}: {
  activeModel: string;
  materialMode: string;
  groupRef: React.RefObject<THREE.Group>;
  materials: ReturnType<typeof useThematicMaterials>;
  modelScale: number;
}) {
  const { scene } = useGLTF(`/assets/${activeModel}`);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useLayoutEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
        let target = child.userData.originalMaterial as THREE.Material;
        if (materialMode === "blueprint") {
          target = materials.blueprint;
        }
        if (materialMode === "editorial") {
          target = materials.editorial;
        }
        child.material = target;
      }
    });
  }, [clonedScene, materialMode, activeModel, materials]);

  return (
    <group ref={groupRef} name={HULL_GROUP_NAME} scale={modelScale}>
      <primitive object={clonedScene} />
    </group>
  );
}

function LabelModel({
  materialMode,
  groupRef,
  materials,
  huygensHasSeparated,
  modelScale,
}: {
  materialMode: string;
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
    if (materialMode === "blueprint") return materials.blueprint;
    if (materialMode === "editorial") return materials.editorial;
    return null;
  })();

  const liveAnchors = useLiveLabelAnchors(anchorRefs, huygensHasSeparated);

  useFrame(() => {
    labelAnchorsRef.current = liveAnchors.current;
  });

  const Hull = huygensHasSeparated
    ? CassiniHuygensAwithoutHuygens
    : CassiniHuygensA;
  const geoHull = (
    <Hull geo anchorRefs={anchorRefs} overrideMaterial={overrideMaterial} />
  );

  return (
    <group ref={groupRef} name={HULL_GROUP_NAME} scale={modelScale}>
      {overrideMaterial ? (
        geoHull
      ) : (
        <Suspense fallback={geoHull}>
          <Hull anchorRefs={anchorRefs} overrideMaterial={overrideMaterial} />
        </Suspense>
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
  const autoRotate = useMissionStore((s) => s.autoRotate);
  const hullReady = useMissionStore((s) => s.hullReady);

  // Runs after the hull GLB resolves
  useEffect(() => {
    useMissionStore.getState().setHullReady();
  }, []);

  const huygensHasSeparated = useMissionStore(
    (s) => s.currentT >= HUYGENS_SEPARATION_T,
  );

  let actualModel = activeModel;
  if (!showLabels && activeModel === "CassiniHuygensA.glb") {
    if (huygensHasSeparated) {
      actualModel = "CassiniHuygensAwithoutHyugens.glb";
    }
  }

  // editorial's wireframe has no PBR hull for heat glow and opacity erosion
  const isTerminal = useMissionStore((s) =>
    isTerminalTableau(getActiveTableau(s.currentT).id),
  );
  const materialMode =
    renderMode === "editorial" && isTerminal ? "space" : renderMode;

  const needsMaterialResetRef = useRef(false);
  useEffect(() => {
    needsMaterialResetRef.current = true;
  }, [actualModel, showLabels, materialMode]);

  const materials = useThematicMaterials();

  const isHomepage = useMissionStore(
    (s) => s.currentT < HOMEPAGE_T_EPSILON,
  );
  const themeScale =
    renderMode === "editorial"
      ? EDITORIAL_MODEL_SCALE
      : renderMode === "blueprint"
        ? BLUEPRINT_MODEL_SCALE
        : SPACE_MODEL_SCALE;
  const isMoonTableau = useMissionStore(
    (s) => getActiveTableau(s.currentT).kind === "moon",
  );
  const baseModelScale = isHomepage && !showLabels ? themeScale : 1;
  const modelScale =
    isMoonTableau && !isHomepage
      ? baseModelScale * MOON_TABLEAU_SCALE
      : baseModelScale;

  useCameraFraming(cameraResetNonce, showLabels);

  const targetPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const livePosRef = useRef(new THREE.Vector3(0, 0, 0));
  // Tableau id from the previous frame, for the snap on the way out of the arrival.
  const prevTableauIdRef = useRef<string>("");
  const goldShineOnRef = useRef(false);
  const orbitalScaleRef = useRef(ORBITAL_MODEL_SCALE);
  const driftClockRef = useRef(0);
  const liveDriftAmpRef = useRef(6.5);
  const liveDriftSpeedRef = useRef(0.18);

  useEffect(() => {
    const t = useMissionStore.getState().currentT;
    const tableau = getActiveTableau(t);
    if (tableau.id === "finale_swing_around") {
      getSwingAroundCassiniPos(t, livePosRef.current);
    } else if (tableau.id === "finale_ring_dive") {
      getRingDiveCassiniPos(t, livePosRef.current);
    } else if (tableau.cassiniOffset) {
      livePosRef.current.set(
        tableau.cassiniOffset[0],
        tableau.cassiniOffset[1],
        tableau.cassiniOffset[2],
      );
    } else {
      livePosRef.current.set(0, 0, 0);
    }
    if (tableau.kind === "cruise") {
      liveDriftAmpRef.current = 6.5;
      liveDriftSpeedRef.current = 0.18;
    } else if (
      tableau.kind === "saturn_focus" ||
      tableau.kind === "finale"
    ) {
      liveDriftAmpRef.current = 3.5;
      liveDriftSpeedRef.current = 0.22;
    } else {
      liveDriftAmpRef.current = 0.55;
      liveDriftSpeedRef.current = 0.55;
    }
  }, [cameraResetNonce]);

  useFrame(({ camera }, deltaRaw) => {
    if (!groupRef.current) return;
    const delta = Number.isFinite(deltaRaw)
      ? Math.min(0.1, Math.max(0, deltaRaw))
      : 0;
    try {
      const t = useMissionStore.getState().currentT;
      const state = stateAt(t);
      const tableau = getActiveTableau(t);
      const traverseNow = getTraverseProgress();
      groupRef.current.rotation.copy(orientationAt(t));

      const disintegrationAmount = state.effects.disintegration || 0;

      if (tableau.id === "finale_swing_around") {
        const sample = getSwingAroundSample(t);
        targetPosRef.current.copy(sample.position);
        ringDiveStateRef.position.copy(sample.position);
        ringDiveStateRef.velocity.copy(sample.velocity);
      } else if (tableau.id === "finale_ring_dive") {
        const sample = getRingDiveSample(t);
        targetPosRef.current.copy(sample.position);
        ringDiveStateRef.position.copy(sample.position);
        ringDiveStateRef.velocity.copy(sample.velocity);
      } else if (isTerminalTableau(tableau.id)) {
        const sample = getPlungeSample(t);
        targetPosRef.current.copy(sample.position);
        ringDiveStateRef.position.copy(sample.position);
        ringDiveStateRef.velocity.copy(sample.velocity);
      } else if (isArrivalTableau(tableau.id)) {
        // Cassini is hidden here (effects.hideCassini) and parks on the camera position.
        targetPosRef.current.copy(camera.position);
      } else if (traverseNow) {
        // Fly the corridor, sampled off the shared curve.
        traverseCassiniPos(
          traverseNow.shot,
          traverseNow.e,
          targetPosRef.current,
        );
      } else if (tableau.cassiniOffset) {
        targetPosRef.current.set(
          tableau.cassiniOffset[0],
          tableau.cassiniOffset[1],
          tableau.cassiniOffset[2],
        );
      } else {
        targetPosRef.current.set(0, 0, 0);
      }

      if (
        tableau.id === "finale_swing_around" ||
        tableau.id === "finale_ring_dive" ||
        isTerminalTableau(tableau.id) ||
        isArrivalTableau(tableau.id)
      ) {
        // Orbital tableaus: trajectory IS the position, no drift or damping.
        groupRef.current.position.copy(targetPosRef.current);
        livePosRef.current.copy(targetPosRef.current);
        groupRef.current.updateMatrix();
      } else {
        const live = livePosRef.current;
        const target = targetPosRef.current;
        // Snap on the way out of the arrival, ahead of Titan's own frame.
        if (
          isArrivalTableau(prevTableauIdRef.current) &&
          !isArrivalTableau(tableau.id)
        ) {
          live.copy(target);
        }
        if (traverseNow) {
          // The corridor pose already has the easing.
          live.copy(target);
        } else {
          live.x = THREE.MathUtils.damp(live.x, target.x, 3.5, delta);
          live.y = THREE.MathUtils.damp(live.y, target.y, 3.5, delta);
          live.z = THREE.MathUtils.damp(live.z, target.z, 3.5, delta);
        }
        if (!Number.isFinite(live.x)) live.x = target.x;
        if (!Number.isFinite(live.y)) live.y = target.y;
        if (!Number.isFinite(live.z)) live.z = target.z;

        const homepageStill = t < HOMEPAGE_T_EPSILON && !autoRotate;

        if (showLabels || homepageStill) {
          groupRef.current.position.copy(live);
        } else {
          driftClockRef.current += delta;
          const c = driftClockRef.current;
          let driftAmpTarget = 0;
          let driftSpeedTarget = 1;
          if (tableau.kind === "cruise") {
            driftAmpTarget = 6.5;
            driftSpeedTarget = 0.18;
          } else if (
            tableau.kind === "saturn_focus" ||
            tableau.kind === "finale"
          ) {
            driftAmpTarget = 3.5;
            driftSpeedTarget = 0.22;
          } else {
            driftAmpTarget = 0.55;
            driftSpeedTarget = 0.55;
          }
          liveDriftAmpRef.current = THREE.MathUtils.damp(
            liveDriftAmpRef.current,
            driftAmpTarget,
            3.5,
            delta,
          );
          liveDriftSpeedRef.current = THREE.MathUtils.damp(
            liveDriftSpeedRef.current,
            driftSpeedTarget,
            3.5,
            delta,
          );
          if (!Number.isFinite(liveDriftAmpRef.current)) {
            liveDriftAmpRef.current = driftAmpTarget;
          }
          if (!Number.isFinite(liveDriftSpeedRef.current)) {
            liveDriftSpeedRef.current = driftSpeedTarget;
          }
          const driftAmp = liveDriftAmpRef.current;
          const driftSpeed = liveDriftSpeedRef.current;
          const driftX = Math.sin(c * driftSpeed) * driftAmp;
          const driftY = Math.sin(c * driftSpeed * 0.7 + 1.7) * driftAmp * 0.45;
          const driftZ = Math.cos(c * driftSpeed * 0.85 + 0.9) * driftAmp * 0.7;
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

      // Wide views the whole orbit from ~2200 out, where the craft is drawn
      // larger; a camera-mode switch eases between the two scales.
      if (isOrbitalTableau(tableau.id)) {
        const target =
          useMissionStore.getState().finaleCameraMode === "wide"
            ? WIDE_MODEL_SCALE
            : ORBITAL_MODEL_SCALE;
        orbitalScaleRef.current = isOrbitalTableau(prevTableauIdRef.current)
          ? THREE.MathUtils.damp(orbitalScaleRef.current, target, 6, delta)
          : target;
        groupRef.current.scale.setScalar(orbitalScaleRef.current);
      } else if (
        isOrbitalTableau(prevTableauIdRef.current) &&
        !isTerminalTableau(tableau.id)
      ) {
        groupRef.current.scale.setScalar(modelScale);
      }

      prevTableauIdRef.current = tableau.id;

      cassiniWorldPos.copy(groupRef.current.position);

      let terminalHeat = 0;
      let terminalFadeOpacity = 1;
      if (isTerminalTableau(tableau.id)) {
        const baseScale = useCameraDebugStore.getState().cassiniScale;
        const cd = useCassiniDebugStore.getState();
        const p = getDescentProgress(t);
        const { shot, localP } = getFinaleShot(p);

        if (shot === "chase") terminalHeat = localP;
        else if (shot === "meteor") terminalHeat = 1;

        const tp = Math.max(
          0,
          Math.min(1, (p - cd.meteorShrinkStart) / Math.max(0.001, cd.meteorShrinkSpan)),
        );
        const sh = tp * tp * (3 - 2 * tp);
        const scaleMul = 1 - sh * (1 - cd.meteorMinScale);
        terminalFadeOpacity = 1 - sh * (1 - cd.meteorMinOpacity);
        groupRef.current.scale.setScalar(baseScale * scaleMul);
      }

      groupRef.current.visible =
        tableau.effects?.hideCassini !== true &&
        disintegrationAmount < 1.0 &&
        terminalFadeOpacity > 0.001;

      const glow = Math.max(disintegrationAmount, terminalHeat);
      if (glow > 0 || terminalFadeOpacity < 1) {
        needsMaterialResetRef.current = true;
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            applyHeatingGlow(child, glow, renderMode);
            applyOpacityErosion(child, disintegrationAmount);
            if (
              terminalFadeOpacity < 1 &&
              child.material instanceof THREE.MeshStandardMaterial
            ) {
              child.material.transparent = true;
              child.material.opacity = Math.min(
                child.material.opacity,
                terminalFadeOpacity,
              );
            }
          }
        });
      } else if (needsMaterialResetRef.current) {
        needsMaterialResetRef.current = false;
        goldShineOnRef.current = false;
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

      // Faint gold glow while the craft is small on screen
      let shine = 0;
      if (
        renderMode === "space" &&
        glow === 0 &&
        camera instanceof THREE.PerspectiveCamera &&
        (tableau.kind === "moon" ||
          (useMissionStore.getState().finaleCameraMode === "wide" &&
            isOrbitalTableau(tableau.id)))
      ) {
        const dist = camera.position.distanceTo(groupRef.current.position);
        const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        // Hull radius as a fraction of half the viewport height
        const screenSize =
          (groupRef.current.scale.x * HULL_RADIUS) /
          Math.max(1e-6, dist * tanHalfFov);
        shine =
          1 -
          THREE.MathUtils.smoothstep(
            screenSize,
            SHINE_FULL_BELOW,
            SHINE_GONE_ABOVE,
          );
      }
      if (shine > 0) {
        goldShineOnRef.current = true;
        groupRef.current.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshStandardMaterial &&
            child.material.name.startsWith("foil_gold")
          ) {
            child.material.emissive.copy(GOLD_SHINE);
            child.material.emissiveIntensity = GOLD_SHINE_INTENSITY * shine;
          }
        });
      } else if (goldShineOnRef.current) {
        goldShineOnRef.current = false;
        needsMaterialResetRef.current = true;
      }
    } catch (err) {
      console.error("[Spacecraft useFrame] swallowed error", err);
    }
  }, -1);

  const warmTextured = hullReady && (
    <Suspense fallback={null}>
      <WarmModel
        url="/assets/CassiniHuygensA.glb"
        onLoaded={warmDeferredModels}
      />
    </Suspense>
  );

  if (showLabels) {
    return (
      <group>
        {warmTextured}
        <LabelModel
          materialMode={materialMode}
          groupRef={groupRef}
          materials={materials}
          huygensHasSeparated={huygensHasSeparated}
          modelScale={modelScale}
        />
        <Suspense fallback={null}>
          <HuygensSeparation />
        </Suspense>
        <RingCrossingFlash />
      </group>
    );
  }

  const displayProps = { materialMode, groupRef, materials, modelScale };
  const geoModel = GEO_MODELS[actualModel] ?? actualModel;

  return (
    <group>
      {warmTextured}
      {materialMode === "space" ? (
        <Suspense
          fallback={<DisplayModel activeModel={geoModel} {...displayProps} />}
        >
          <DisplayModel activeModel={actualModel} {...displayProps} />
        </Suspense>
      ) : (
        <DisplayModel activeModel={geoModel} {...displayProps} />
      )}
      {activeModel !== "CassiniHuygensAwithout_Cassini.glb" &&
        activeModel !== "CassiniHuygensAwithoutHyugens.glb" && (
          <Suspense fallback={null}>
            <HuygensSeparation />
          </Suspense>
        )}
      <RingCrossingFlash />
    </group>
  );
}

useGLTF.preload("/assets/CassiniHuygensA_geo.glb");

// Calls onLoaded once url is in the useGLTF cache.
function WarmModel({ url, onLoaded }: { url: string; onLoaded: () => void }) {
  useGLTF(url);
  useEffect(onLoaded, [onLoaded]);
  return null;
}

let deferredWarmed = false;

function warmDeferredModels() {
  if (deferredWarmed) return;
  deferredWarmed = true;
  useGLTF.preload("/assets/CassiniHuygensAwithoutHyugens_geo.glb");
  useGLTF.preload("/assets/CassiniHuygensAwithoutHyugens.glb");
  useGLTF.preload("/assets/CassiniHuygensAwithout_Cassini.glb");
}
