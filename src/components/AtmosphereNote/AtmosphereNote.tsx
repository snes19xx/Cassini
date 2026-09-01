import { ATMOSPHERE_TABLEAU_ID } from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import styles from "./AtmosphereNote.module.css";

// LABELS show this note on the atmosphere tableau, which has no body to anchor a callout to.
export function AtmosphereNote() {
  // Flips only at the tableau boundary and on the LABELS toggle.
  const show = useMissionStore(
    (s) =>
      s.showLabels && getActiveTableau(s.currentT).id === ATMOSPHERE_TABLEAU_ID,
  );

  if (!show) return null;

  return (
    <aside className={styles.note} aria-label="Atmospheric note">
      <span className={styles.label}>Why the sky is blue</span>
      <p className={styles.body}>
        Above Saturn&rsquo;s cloud decks and haze, sunlight scatters off
        molecular hydrogen and helium &mdash; Rayleigh scattering, the same
        physics that makes Earth&rsquo;s sky blue.
      </p>
    </aside>
  );
}
