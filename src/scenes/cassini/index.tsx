// src/scenes/cassini/index.tsx

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Projector } from "../../components/Labels/Projector";
import { useMissionStore } from "../../store/missionStore";
import { getActiveTableau } from "./data/tableaus";
import { MissionTimeAdvancer } from "./parts/MissionTimeAdvancer";
import { SceneLighting } from "./parts/SceneLighting";
import { TableauResolver } from "./parts/TableauResolver";
import { TextureServiceDriver } from "./parts/TextureServiceDriver";
import { Spacecraft } from "./Spacecraft";

function SceneControls() {
  const inspectionLocked = useMissionStore(
    (s) => s.showLabels && s.inspectionView !== null && s.currentT < 0.001,
  );
  const autoRotate = useMissionStore(
    (s) =>
      s.autoRotate &&
      !(s.showLabels && s.inspectionView !== null && s.currentT < 0.001),
  );
  // Two scalar selectors instead of one object selector: the object form
  // returned a fresh {min, max} every call, so zustand's equality check
  // never passed and this component re-rendered on every store write.
  const zoomMin = useMissionStore((s) => {
    const tab = getActiveTableau(s.currentT);
    return s.currentT < 0.001 ? tab.zoom.minDist * 0.7 : tab.zoom.minDist;
  });
  const zoomMax = useMissionStore((s) => {
    const tab = getActiveTableau(s.currentT);
    return s.currentT < 0.001 ? tab.zoom.maxDist * 1.2 : tab.zoom.maxDist;
  });
  const autoRotateSpeed = useMissionStore((s) =>
    getActiveTableau(s.currentT).kind === "moon" ? 0.25 : 0.5,
  );

  return (
    <OrbitControls
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
      makeDefault
      minDistance={zoomMin}
      maxDistance={zoomMax}
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
    </Canvas>
  );
}
