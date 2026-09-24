// src/components/TitanCameraSwitcher/TitanCameraSwitcher.tsx
//
// Floating button flipping the titan_huygens camera between SHOULDER and WIDE,
// off the same resolver the driver gates on.

import { titanCameraMode } from "@/scenes/cassini/lib/titanCamera";
import { type TitanCameraMode, useMissionStore } from "@/store/missionStore";
import styles from "./TitanCameraSwitcher.module.css";

const LABEL: Record<TitanCameraMode, string> = {
  shoulder: "SHOULDER",
  wide: "WIDE",
};

const NEXT_HINT: Record<TitanCameraMode, string> = {
  shoulder: "Switch to WIDE: pull back to the full Titan framing",
  wide: "Switch to SHOULDER: ride Cassini and watch Huygens descend",
};

export function TitanCameraSwitcher() {
  const mode = useMissionStore((s) =>
    titanCameraMode(s.currentT, s.titanCameraOverride),
  );
  const toggleTitanCamera = useMissionStore((s) => s.toggleTitanCamera);

  if (mode === null) return null;

  const isAccent = mode === "shoulder";

  return (
    <button
      type="button"
      className={`${styles.toggle} ${isAccent ? styles.active : ""}`}
      onClick={() => toggleTitanCamera(mode)}
      aria-pressed={isAccent}
      title={NEXT_HINT[mode]}
    >
      <span className={styles.label}>CAMERA</span>
      <span className={styles.value}>{LABEL[mode]}</span>
    </button>
  );
}
