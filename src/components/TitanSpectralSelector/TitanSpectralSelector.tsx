import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { TitanSpectralMode, useMissionStore } from "@/store/missionStore";
import { useEffect, useRef, useState } from "react";
import styles from "./TitanSpectralSelector.module.css";

export const TITAN_MODE_INFO: Record<
  TitanSpectralMode,
  { label: string; instrument: string; description: string }
> = {
  visible: {
    label: "VISIBLE",
    instrument: "ISS · RGB",
    description: "Natural amber haze — surface obscured",
  },
  vims_ir: {
    label: "VIMS IR",
    instrument: "VIMS · 5.0 / 2.0 / 1.3 μm",
    description: "Dunes (brown) vs. water-ice signatures (blue)",
  },
  iss_cb3: {
    label: "ISS 938",
    instrument: "ISS · CB3 938 nm",
    description: "Methane window — surface albedo through haze",
  },
  iss_nac_ir: {
    label: "ISS NAC",
    instrument: "ISS · 756 / 889 / 938 nm",
    description: "Naturalistic near-IR composite",
  },
};

const TITAN_MODE_ORDER: TitanSpectralMode[] = [
  "visible",
  "vims_ir",
  "iss_cb3",
  "iss_nac_ir",
];

// Spectral filter panel for the Titan tableau, button per instrument mode.
export function TitanSpectralSelector() {
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);
  const titanMode = useMissionStore((s) => s.titanSpectralMode);
  const setTitanMode = useMissionStore((s) => s.setTitanSpectralMode);

  const visible = tableauId === "titan_huygens";

  const [pulse, setPulse] = useState(false);
  const hasPulsed = useRef(false);
  useEffect(() => {
    if (visible && !hasPulsed.current) {
      hasPulsed.current = true;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 3000);
      return () => clearTimeout(t);
    }
    if (!visible) hasPulsed.current = false;
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`${styles.panel} ${styles.grid} ${pulse ? styles.pulse : ""}`}
      role="group"
      aria-label="Titan spectral filter"
    >
      <span className={styles.label}>TITAN · IMAGING</span>
      <div className={styles.gridButtons}>
        {TITAN_MODE_ORDER.map((id) => {
          const info = TITAN_MODE_INFO[id];
          const active = titanMode === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.btn} ${active ? styles.active : ""}`}
              onClick={() => setTitanMode(id)}
              aria-pressed={active}
              title={info.description}
            >
              <span className={styles.btnLabel}>{info.label}</span>
              <span className={styles.btnSub}>{info.instrument}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
