// src/components/InfoPanel/MoonPanel.tsx
//
// Fact panel for a moon clicked in the labels overlay, styled off
// InfoPanel.module.css so the mission panel can stay open beside it.

import { getMoonFact, moonLabelledIn } from "@/scenes/cassini/data/moonFacts";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { infoPanelVisible, useMissionStore } from "@/store/missionStore";
import { useEffect } from "react";
import styles from "./InfoPanel.module.css";

export function MoonPanel() {
  const activeMoon = useMissionStore((s) => s.activeMoon);
  const setActiveMoon = useMissionStore((s) => s.setActiveMoon);
  const renderMode = useMissionStore((s) => s.renderMode);
  const showLabels = useMissionStore((s) => s.showLabels);
  // Left is the mission panel's slot, taken only while that panel is hidden.
  const dockLeft = useMissionStore((s) => !infoPanelVisible(s));
  // getActiveTableau returns the TABLEAUS entry itself, so this selector only
  // fires on a window boundary.
  const tableau = useMissionStore((s) => getActiveTableau(s.currentT));

  const stale =
    !showLabels || !activeMoon || !moonLabelledIn(tableau, activeMoon);
  useEffect(() => {
    if (activeMoon && stale) setActiveMoon(null);
  }, [activeMoon, stale, setActiveMoon]);

  const fact = activeMoon ? getMoonFact(activeMoon) : null;
  if (!fact || stale) return null;

  return (
    <div
      className={`${styles.wrapper} ${styles.moonPanel}`}
      data-position={dockLeft ? "left" : "right"}
      data-theme={renderMode.toLowerCase()}
      role="region"
      aria-label={`${fact.name} information`}
    >
      <header className={styles.header}>
        <span className={styles.missionId}>CAS-HUY / MOON</span>
        <div className={styles.headerActions}>
          <button
            className={styles.closeBtn}
            onClick={() => setActiveMoon(null)}
            aria-label="Close panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M1 13L13 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className={styles.scrollBody}>
        <div className={styles.detailHeader}>
          <h2 className={styles.detailName}>{fact.name}</h2>
        </div>
        {fact.paragraphs.map((text, i) => (
          <p key={i} className={styles.detailBody}>
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
