// src/scenes/cassini/parts/TextureServiceDriver.tsx
//
// Lifecycle wiring for the moon TextureService: initializes on mount,
// reacts to render-mode and spectral-mode toggles, ticks every frame.
// Renders nothing.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import {
  initialize,
  setBlueprintMode,
  setEnceladusMode,
  setTitanMode,
  tick,
} from "../lib/textureService";
import { useMissionStore } from "@/store/missionStore";

export function TextureServiceDriver() {
  const { gl } = useThree();
  const renderMode = useMissionStore((s) => s.renderMode);
  const titanMode = useMissionStore((s) => s.titanSpectralMode);
  const enceladusMode = useMissionStore((s) => s.enceladusSpectralMode);

  useEffect(() => {
    void initialize(gl);
  }, [gl]);

  useEffect(() => {
    setBlueprintMode(renderMode === "blueprint");
  }, [renderMode]);

  useEffect(() => {
    setTitanMode(titanMode, gl);
  }, [titanMode, gl]);

  useEffect(() => {
    setEnceladusMode(enceladusMode, gl);
  }, [enceladusMode, gl]);

  useFrame(() => {
    const t = useMissionStore.getState().currentT;
    tick(t, gl);
  });

  return null;
}
