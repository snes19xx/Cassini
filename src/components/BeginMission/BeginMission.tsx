import { useMissionStore } from "@/store/missionStore";
import { useEffect, useState } from "react";
import styles from "./BeginMission.module.css";

const HOMEPAGE_T_EPSILON = 0.001;

// Fade starts at TTL - fade duration, gone at TTL.
const TTL_MS = 8000;
const FADE_MS = 600;

// First-visit call to action pointing new visitors at the play-through.
export function BeginMission() {
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const onHomepage = useMissionStore(
    (s) => !s.isPlaying && s.currentT < HOMEPAGE_T_EPSILON && !s.showLabels,
  );
  const togglePlay = useMissionStore((s) => s.togglePlay);

  useEffect(() => {
    if (!onHomepage) setDismissed(true);
  }, [onHomepage]);

  useEffect(() => {
    const fade = setTimeout(() => setPhase("out"), TTL_MS - FADE_MS);
    const gone = setTimeout(() => setPhase("gone"), TTL_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "gone" || dismissed || !onHomepage) return null;

  return (
    <button
      type="button"
      className={`${styles.begin}${phase === "out" ? ` ${styles.beginOut}` : ""}`}
      onClick={togglePlay}
    >
      <span className={styles.glyph} aria-hidden>
        {"▶︎"}
      </span>
      BEGIN MISSION
    </button>
  );
}
