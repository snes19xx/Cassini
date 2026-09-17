import { isOrbitalTableau } from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { type FinaleCameraMode, useMissionStore } from "@/store/missionStore";
import styles from "./FinaleCameraSwitcher.module.css";

const LABEL: Record<FinaleCameraMode, string> = {
  thirdPerson: "CHASE",
  pov: "POV",
  wide: "WIDE",
};

const NEXT_HINT: Record<FinaleCameraMode, string> = {
  thirdPerson: "Switch to POV — Cassini's nose, looking forward",
  pov: "Switch to WIDE — pull back, see the whole orbit",
  wide: "Switch to CHASE — follow Cassini with Saturn behind",
};

// Cycles the finale camera between chase, POV, and wide during the orbital tableaus.
export function FinaleCameraSwitcher() {
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);
  const finaleCameraMode = useMissionStore((s) => s.finaleCameraMode);
  const cycleFinaleCameraMode = useMissionStore((s) => s.cycleFinaleCameraMode);

  if (!isOrbitalTableau(tableauId)) return null;

  const isAccent = finaleCameraMode !== "thirdPerson";

  return (
    <button
      type="button"
      className={`${styles.toggle} ${isAccent ? styles.active : ""}`}
      onClick={cycleFinaleCameraMode}
      aria-pressed={isAccent}
      title={NEXT_HINT[finaleCameraMode]}
    >
      <span className={styles.label}>CAMERA</span>
      <span className={styles.value}>{LABEL[finaleCameraMode]}</span>
    </button>
  );
}
