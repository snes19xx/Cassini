import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { LightingMode, useMissionStore } from "@/store/missionStore";
import styles from "./MoonLightingToggle.module.css";

const LABEL: Record<LightingMode, string> = {
  natural: "NATURAL",
  rim: "RIM",
  full: "FULL",
};
const NEXT_HINT: Record<LightingMode, string> = {
  natural: "Reveal the dark side (RIM)",
  rim: "Light everything from all sides (FULL)",
  full: "Back to natural sun-side lighting",
};

// Floating button on moon tableaus : NATURAL, RIM, and FULL lighting.
export function MoonLightingToggle() {
  const lightingMode = useMissionStore((s) => s.lightingMode);
  const toggleLightingMode = useMissionStore((s) => s.toggleLightingMode);
  const tableauKind = useMissionStore((s) => getActiveTableau(s.currentT).kind);
  const renderMode = useMissionStore((s) => s.renderMode);

  if (tableauKind !== "moon") return null;
  // Editorial theme locks lighting to Full
  if (renderMode === "editorial") return null;

  const isAccent = lightingMode !== "natural";

  return (
    <button
      type="button"
      className={`${styles.toggle} ${isAccent ? styles.active : ""}`}
      onClick={toggleLightingMode}
      aria-pressed={isAccent}
      title={NEXT_HINT[lightingMode]}
    >
      <span className={styles.label}>LIGHTING</span>
      <span className={styles.value}>{LABEL[lightingMode]}</span>
    </button>
  );
}
