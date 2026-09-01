import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import styles from "./PlumesToggle.module.css";

// Floating ON/OFF button for the Enceladus south-polar plumes, off by default.
export function PlumesToggle() {
  const showPlumes = useMissionStore((s) => s.showPlumes);
  const togglePlumes = useMissionStore((s) => s.togglePlumes);
  const plumesAvailable = useMissionStore(
    (s) => getActiveTableau(s.currentT).effects?.plumes === true,
  );
  const renderMode = useMissionStore((s) => s.renderMode);

  if (!plumesAvailable) return null;
  // Plumes never render in blueprint.
  if (renderMode === "blueprint") return null;

  return (
    <button
      type="button"
      className={`${styles.toggle} ${showPlumes ? styles.active : ""}`}
      onClick={togglePlumes}
      aria-pressed={showPlumes}
      title={
        showPlumes
          ? "Hide the south-polar geysers"
          : "Reveal the south-polar geysers (PIA23175)"
      }
    >
      <span className={styles.label}>PLUMES</span>
      <span className={styles.value}>{showPlumes ? "ON" : "OFF"}</span>
    </button>
  );
}
