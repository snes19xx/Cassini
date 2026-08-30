// src/scenes/cassini/finale/parts/FinaleTelemetryBlock.tsx

import { DIVES, currentDiveIndex } from "../data/diveTable";
import {
  downlinkLabel,
  formatCountdown,
  getAltitudeKm,
  getDownlinkState,
  getFinaleVelocityKms,
  getSkinTemperatureK,
  getStructuralIntegrity,
  timeToNextDiveSec,
} from "../lib/finalePhase";
import { getFinaleSubphase } from "../data/subphases";
import styles from "@/components/InfoPanel/InfoPanel.module.css";

// Local copies of Stat/BarRow so this file doesn't import from InfoPanel.tsx.

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

function BarRow({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  const display = `${Math.round(value * 100)}%`;
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.bar}>
        <div
          className={styles.barFill}
          style={{
            width: `${value * 100}%`,
            background:
              warn && value < 0.4 ? "var(--color-warn, #ff6b35)" : undefined,
          }}
        />
      </div>
      <span className={styles.barValue}>{display}</span>
    </div>
  );
}

function fmtAltitude(km: number): string {
  if (km >= 10000) return `${(km / 1000).toFixed(1).replace(/\.0$/, "")} K km`;
  if (km >= 1000) return `${Math.round(km).toLocaleString()} km`;
  return `${Math.round(km)} km`;
}

interface Props {
  t: number;
}

export function FinaleTelemetryBlock({ t }: Props) {
  const subphase = getFinaleSubphase(t);
  const diveIndex = currentDiveIndex(t);
  const altitude = getAltitudeKm(t);
  const velocity = getFinaleVelocityKms(t);
  const downlink = getDownlinkState(t);
  const skinTempK = getSkinTemperatureK(t);
  const integrity = getStructuralIntegrity(t);
  const countdownSec = timeToNextDiveSec(t);

  const showHeating =
    subphase === "final5" ||
    subphase === "plunge" ||
    subphase === "plasma" ||
    subphase === "los";
  const showIntegrity =
    subphase === "plunge" || subphase === "plasma" || subphase === "los";

  return (
    <>
      <div className={styles.sectionLabel}>Grand Finale</div>
      <div className={styles.statGrid}>
        <Stat
          label="Dive"
          value={diveIndex > 0 ? `${diveIndex} / ${DIVES.length}` : "-"}
        />
        <Stat label="Altitude" value={fmtAltitude(altitude)} />
        <Stat label="Velocity" value={`${velocity.toFixed(1)} km/s`} />
        <Stat label="Next dive" value={formatCountdown(countdownSec)} />
      </div>

      <div className={styles.sectionLabel}>Link</div>
      <div className={styles.statGrid}>
        <Stat label="Downlink" value={downlinkLabel(downlink)} />
        <Stat label="Phase" value={subphase.toUpperCase()} />
      </div>

      {showHeating && (
        <>
          <div className={styles.sectionLabel}>Heating</div>
          <div className={styles.statGrid}>
            <Stat label="Skin temp" value={`${Math.round(skinTempK)} K`} />
            {showIntegrity && (
              <Stat
                label="Integrity"
                value={`${Math.round(integrity * 100)}%`}
              />
            )}
          </div>
          {showIntegrity && <BarRow label="Structure" value={integrity} warn />}
        </>
      )}
    </>
  );
}
