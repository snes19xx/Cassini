import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import styles from "./Whiteout.module.css";

const PLASMA_START_T = 0.9999;
const LOS_T = 1.0;
const LOS_FADE_DURATION_T = 0.0001;

// DOM overlay, covers the canvas and HUD chrome and also postprocessing layers.
export function Whiteout() {
  // Selector returns -1 outside the tableau so this only re-renders during it.
  const currentT = useMissionStore((s) =>
    getActiveTableau(s.currentT).id === "finale_disintegration"
      ? s.currentT
      : -1,
  );

  if (currentT < 0) return null;

  let opacity: number;
  if (currentT < PLASMA_START_T) {
    opacity = 0;
  } else if (currentT < LOS_T) {
    opacity = (currentT - PLASMA_START_T) / (LOS_T - PLASMA_START_T);
    opacity = Math.max(0, Math.min(1, opacity));
  } else {
    // Fades quickly once past LOS.
    const losProgress = (currentT - LOS_T) / LOS_FADE_DURATION_T;
    opacity = Math.max(0, 1 - losProgress * 3);
  }

  return <div className={styles.whiteout} style={{ opacity }} aria-hidden />;
}
