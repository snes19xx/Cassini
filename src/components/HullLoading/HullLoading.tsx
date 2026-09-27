import { useMissionStore } from "@/store/missionStore";
import { useState } from "react";
import styles from "./HullLoading.module.css";

// Shown over the scene until the first hull frame.
export function HullLoading() {
  const hullReady = useMissionStore((s) => s.hullReady);
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <div
      className={`${styles.loading}${hullReady ? ` ${styles.loadingOut}` : ""}`}
      role="status"
      onTransitionEnd={() => {
        if (hullReady) setGone(true);
      }}
    >
      <div className={styles.inner}>
        <span className={styles.label}>Loading Cassini model</span>
        <span className={styles.sweep} />
      </div>
    </div>
  );
}
