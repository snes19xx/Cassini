import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import {
  EnceladusSpectralMode,
  TitanSpectralMode,
  useMissionStore,
} from "@/store/missionStore";
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

export const ENCELADUS_MODE_INFO: Record<
  EnceladusSpectralMode,
  { label: string; instrument: string; description: string }
> = {
  visible: {
    label: "ENH COLOUR",
    instrument: "ISS · UV3 338 / G 568 / IR3 930",
    description: "Cratered north vs. fractured southern terrain",
  },
  vims_ir: {
    label: "VIMS IR",
    instrument: "VIMS · 1.8 / 1.3 / 1.1 μm",
    description: "Tiger-stripe fresh ice vs. older terrain",
  },
};

const TITAN_MODE_ORDER: TitanSpectralMode[] = [
  "visible",
  "vims_ir",
  "iss_cb3",
  "iss_nac_ir",
];
const ENCELADUS_MODE_ORDER: EnceladusSpectralMode[] = ["visible", "visible"];

// Spectral filter panel for the Titan and Enceladus tableaus, button per instrument mode.
export function SpectralSelector() {
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);
  const titanMode = useMissionStore((s) => s.titanSpectralMode);
  const enceladusMode = useMissionStore((s) => s.enceladusSpectralMode);
  const setTitanMode = useMissionStore((s) => s.setTitanSpectralMode);
  const setEnceladusMode = useMissionStore((s) => s.setEnceladusSpectralMode);

  const isTitan = tableauId === "titan_huygens";
  const isEnceladus = tableauId === "enceladus";
  const visible = isTitan || isEnceladus;

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

  const isGrid = isTitan; // 2x2 grid for Titan

  return (
    <div
      className={`${styles.panel} ${isGrid ? styles.grid : styles.row} ${
        pulse ? styles.pulse : ""
      }`}
      role="group"
      aria-label={
        isTitan ? "Titan spectral filter" : "Enceladus spectral filter"
      }
    >
      <span className={styles.label}>
        {isTitan ? "TITAN · IMAGING" : "ENCELADUS · IMAGING"}
      </span>
      <div className={isGrid ? styles.gridButtons : styles.buttons}>
        {isTitan
          ? TITAN_MODE_ORDER.map((id) => {
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
            })
          : ENCELADUS_MODE_ORDER.map((id) => {
              const info = ENCELADUS_MODE_INFO[id];
              const active = enceladusMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`${styles.btn} ${active ? styles.active : ""}`}
                  onClick={() => setEnceladusMode(id)}
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
