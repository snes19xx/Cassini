// src/scenes/cassini/index.tsx

// Evaluates before the module-level GLB preloads
import "./lib/loaderBase";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
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
import { PrewarmTerminal } from "./finale/parts/PrewarmTerminal";
import { RingDiveCameraDriver } from "./finale/parts/RingDiveCameraDriver";
import { titanCameraMode } from "./lib/titanCamera";
import { useTransitionStore } from "./lib/useTransitionStore";
import { MissionTimeAdvancer } from "./parts/MissionTimeAdvancer";
import { SceneLighting } from "./parts/SceneLighting";
import { TableauResolver } from "./parts/TableauResolver";
import { TextureServiceDriver } from "./parts/TextureServiceDriver";
import { TitanShoulderCamera } from "./parts/TitanShoulderCamera";
import { TransitionDriver } from "./parts/TransitionDriver";
import { Spacecraft } from "./Spacecraft";

const CHASE_ZOOM_MIN = 15;

function SceneControls() {
  const inspectionLocked = useMissionStore(
    (s) => s.showLabels && s.inspectionView !== null && s.currentT < 0.001,
  );
  const inFly = useTransitionStore((s) => s.phase === "flying");

  // Single derived source for OrbitControls.enabled: locked while the
  // terminal plunge or finale POV or the Titan shouldercamera drives the camera,
  // or mid-fly.
  const orbitLocked = useMissionStore((s) => {
    const id = getActiveTableau(s.currentT).id;
    return (
      isTerminalTableau(id) ||
      (s.finaleCameraMode === "pov" && isOrbitalTableau(id)) ||
      titanCameraMode(s.currentT, s.titanCameraOverride) === "shoulder"
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
    // Chase orbits Cassini 40 units off; a grab must not throw it to 400.
    if (s.finaleCameraMode === "thirdPerson" && isOrbitalTableau(tab.id)) {
      return CHASE_ZOOM_MIN;
    }
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

// At fractional zoom three's floor(cssSize * dpr) buffer can land a device
// pixel short of the composited box, and the browser's stretch smears 1px
// wireframe lines into half-bright pairs. Sizing the CSS box to buffer/dpr
// keeps it 1:1, checked per frame because R3F rewrites the style on resize.
function PixelAlignedCanvas() {
  const gl = useThree((s) => s.gl);
  const applied = useRef({ w: "", h: "" });
  useFrame(() => {
    const canvas = gl.domElement;
    if (canvas.width === 0 || canvas.height === 0) return;
    const { style } = canvas;
    if (style.width === applied.current.w && style.height === applied.current.h)
      return;
    const dpr = gl.getPixelRatio();
    style.width = `${canvas.width / dpr}px`;
    style.height = `${canvas.height / dpr}px`;
    // Read back the serialized values to match next frame's compare.
    applied.current = { w: style.width, h: style.height };
  });
  return null;
}

export function CassiniScene() {
  return (
    <Canvas
      camera={{ position: [25, 12, 45], fov: 45, near: 0.1, far: 100000 }}
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
    >
      <CameraAndRendererSetup />
      <PixelAlignedCanvas />
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
      <TitanShoulderCamera />
      <FinalePlungeCamera />
      <AtmosphericHaze />
      <CassiniMeteor />
      <FinaleBloom />
      <PrewarmTerminal />
    </Canvas>
  );
}
