// src/scenes/cassini/parts/TextureServiceDriver.tsx
//
// Lifecycle wiring for the moon TextureService: initializes on mount,
// reacts to render-mode and spectral-mode toggles, ticks every frame.
// Renders nothing.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { getActiveTableau } from "../data/tableaus";
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
  const prevTableauRef = useRef<string>("");

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
    const state = useMissionStore.getState();
    const t = state.currentT;
    const tableau = getActiveTableau(t);

    if (prevTableauRef.current && prevTableauRef.current !== tableau.id) {
      if (
        prevTableauRef.current === "titan_huygens" &&
        state.titanSpectralMode !== "visible"
      ) {
        state.setTitanSpectralMode("visible");
      }
      if (
        prevTableauRef.current === "enceladus" &&
        state.enceladusSpectralMode !== "visible"
      ) {
        state.setEnceladusSpectralMode("visible");
      }
    }
    prevTableauRef.current = tableau.id;

    tick(t, gl);
  });

  return null;
}
