// src/scenes/cassini/index.tsx

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Projector } from "../../components/Labels/Projector";
import { useMissionStore } from "../../store/missionStore";
import { isOrbitalTableau, isTerminalTableau } from "./data/missionConstants";
import { getActiveTableau } from "./data/tableaus";
import {
  AtmosphericHaze,
  CassiniMeteor,
  FinaleBloom,
} from "./finale/parts/FinaleEffects";
import { FinalePlungeCamera } from "./finale/parts/FinalePlungeCamera";
import { RingDiveCameraDriver } from "./finale/parts/RingDiveCameraDriver";
import { useTransitionStore } from "./lib/useTransitionStore";
import { MissionTimeAdvancer } from "./parts/MissionTimeAdvancer";
import { SceneLighting } from "./parts/SceneLighting";
import { TableauResolver } from "./parts/TableauResolver";
import { TextureServiceDriver } from "./parts/TextureServiceDriver";
import { TransitionDriver } from "./parts/TransitionDriver";
import { Spacecraft } from "./Spacecraft";

function SceneControls() {
  const inspectionLocked = useMissionStore(
    (s) => s.showLabels && s.inspectionView !== null && s.currentT < 0.001,
  );
  const inFly = useTransitionStore((s) => s.phase === "flying");

  // Single derived source for OrbitControls.enabled: locked while the
  // terminal plunge or finale POV owns the camera, or mid-fly.
  const orbitLocked = useMissionStore((s) => {
    const id = getActiveTableau(s.currentT).id;
    return (
      isTerminalTableau(id) ||
      (s.finaleCameraMode === "pov" && isOrbitalTableau(id))
    );
  });
  const orbitEnabled = !orbitLocked && !inFly;

  const autoRotate =
    useMissionStore(
      (s) =>
        s.autoRotate &&
        !(s.showLabels && s.inspectionView !== null && s.currentT < 0.001),
    ) && orbitEnabled;
  // Scalar selectors: an object {min, max} selector returns a fresh
  // object every call, which fails zustand's equality check every time.
  const zoomMin = useMissionStore((s) => {
    const tab = getActiveTableau(s.currentT);
    return s.currentT < 0.001 ? tab.zoom.minDist * 0.7 : tab.zoom.minDist;
  });
  const zoomMax = useMissionStore((s) => {
    const tab = getActiveTableau(s.currentT);
    return s.currentT < 0.001 ? tab.zoom.maxDist * 1.2 : tab.zoom.maxDist;
  });
  const autoRotateSpeed = useMissionStore((s) => {
    const tab = getActiveTableau(s.currentT);
    if (tab.autoRotateSpeed !== undefined) return tab.autoRotateSpeed;
    const base = tab.kind === "moon" ? 0.25 : 0.5;
    // Scales the orbit rate down with focal length so a telephoto tableau's
    // apparent drift matches the wide scenes.
    return base * ((tab.camera.fov ?? 45) / 45);
  });
  const orbitLimits = useMissionStore(
    (s) => getActiveTableau(s.currentT).orbitLimits,
  );

  return (
    <OrbitControls
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
      makeDefault
      minDistance={zoomMin}
      maxDistance={zoomMax}
      minAzimuthAngle={orbitLimits?.minAzimuth ?? -Infinity}
      maxAzimuthAngle={orbitLimits?.maxAzimuth ?? Infinity}
      minPolarAngle={orbitLimits?.minPolar ?? 0}
      maxPolarAngle={orbitLimits?.maxPolar ?? Math.PI}
      enabled={orbitEnabled}
      enablePan={!inspectionLocked}
      enableZoom={!inspectionLocked}
      enableRotate={!inspectionLocked}
    />
  );
}

function SceneEnvironment() {
  const renderMode = useMissionStore((s) => s.renderMode);

  return (
    <>
      <SceneLighting renderMode={renderMode} />
    </>
  );
}

function CameraAndRendererSetup() {
  const { camera, gl } = useThree();
  useEffect(() => {
    camera.layers.enable(1);
    gl.toneMapping = THREE.NoToneMapping;
    gl.toneMappingExposure = 1.0;
  }, [camera, gl]);
  return null;
}

export function CassiniScene() {
  return (
    <Canvas
      camera={{ position: [25, 12, 45], fov: 45, near: 0.1, far: 100000 }}
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
    >
      <CameraAndRendererSetup />
      <MissionTimeAdvancer />
      <SceneEnvironment />
      <TextureServiceDriver />
      <Suspense fallback={null}>
        <TableauResolver />
      </Suspense>
      <Suspense fallback={null}>
        <Spacecraft />
      </Suspense>
      <Projector />
      <SceneControls />
      <TransitionDriver />
      <RingDiveCameraDriver />
      <FinalePlungeCamera />
      <AtmosphericHaze />
      <CassiniMeteor />
      <FinaleBloom />
    </Canvas>
  );
}
