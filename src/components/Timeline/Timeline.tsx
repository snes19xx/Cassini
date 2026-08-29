import { DIVES } from "@/scenes/cassini/finale/data/diveTable";
import {
  JUMP_TO_TABLEAU,
  TABLEAUS,
  getActiveTableau,
} from "@/scenes/cassini/data/tableaus";
import { clampSeekT } from "@/scenes/cassini/data/missionConstants";
import {
  displayToMission,
  missionToDisplay,
} from "@/scenes/cassini/lib/tRemap";
import { PlaybackSpeed, useMissionStore } from "@/store/missionStore";
import { useCallback, useMemo, useRef, useState } from "react";
import styles from "./Timeline.module.css";

//  Inline SVG icons

function IconPlay() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden>
      <path d="M1 1.5L11 7L1 12.5V1.5Z" fill="currentColor" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden>
      <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

//  Helpers

function tToMissionDate(t: number): string {
  const startMs = new Date("1997-10-15").getTime();
  const endMs = new Date("2017-09-15").getTime();
  const d = new Date(startMs + t * (endMs - startMs));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function tToPercent(t: number): string {
  return `${(t * 100).toFixed(1)}%`;
}

const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10];

// Chronological encounter order.
const JUMP_LABELS: { label: string; tableauId: string }[] = [
  { label: "SATURN", tableauId: JUMP_TO_TABLEAU.SATURN! },
  { label: "TITAN", tableauId: JUMP_TO_TABLEAU.TITAN! },
  { label: "ENCELADUS", tableauId: JUMP_TO_TABLEAU.ENCELADUS! },
  { label: "IAPETUS", tableauId: JUMP_TO_TABLEAU.IAPETUS! },
  { label: "MIMAS", tableauId: JUMP_TO_TABLEAU.MIMAS! },
  { label: "TETHYS", tableauId: JUMP_TO_TABLEAU.TETHYS! },
  { label: "DIONE", tableauId: JUMP_TO_TABLEAU.DIONE! },
  { label: "RHEA", tableauId: JUMP_TO_TABLEAU.RHEA! },
  { label: "FAMILY", tableauId: JUMP_TO_TABLEAU.FAMILY! },
  { label: "CRESCENTS", tableauId: JUMP_TO_TABLEAU.CRESCENTS! },
  { label: "FINAL DIVES", tableauId: JUMP_TO_TABLEAU.FINALE! },
  { label: "GRAND FINALE", tableauId: JUMP_TO_TABLEAU.ATMOSPHERE! },
];

//  Component

export function Timeline() {
  const currentT = useMissionStore((s) => s.currentT);
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);

  const setTime = useMissionStore((s) => s.setTime);
  const togglePlay = useMissionStore((s) => s.togglePlay);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);

  const fillRef = useRef<HTMLDivElement>(null);

  // Local until release, then the store's currentT takes back over.
  const [dragDisplayT, setDragDisplayT] = useState<number | null>(null);

  const tableauById = useMemo(() => {
    const map: Record<string, { tStart: number; jumpT?: number }> = {};
    for (const tab of TABLEAUS) {
      map[tab.id] = { tStart: tab.tStart, jumpT: tab.jumpT };
    }
    return map;
  }, []);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const missionT = clampSeekT(displayToMission(parseFloat(e.target.value)));
      const displayT = missionToDisplay(missionT);
      setDragDisplayT(displayT);
      setTime(missionT);
      if (fillRef.current) {
        fillRef.current.style.width = `${displayT * 100}%`;
      }
    },
    [setTime],
  );

  const endScrub = useCallback(() => setDragDisplayT(null), []);

  const handleJump = useCallback(
    (tableauId: string) => {
      const tab = tableauById[tableauId];
      if (!tab) return;
      setTime(tab.jumpT ?? tab.tStart + 1e-5);
      useMissionStore.getState().resetCamera();
    },
    [tableauById, setTime],
  );

  const activeTableau = getActiveTableau(currentT);
  const displayT = dragDisplayT ?? missionToDisplay(currentT);
  const pct = displayT * 100;

  return (
    <div className={styles.wrapper} role="region" aria-label="Mission timeline">
      <div className={styles.topRow}>
        <div className={styles.controls}>
          <button
            className={`${styles.transportBtn} ${styles.playPause}`}
            onClick={togglePlay}
            aria-label={
              isPlaying ? "Pause mission playback" : "Play mission playback"
            }
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>

          <div className={styles.speedGroup} aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`${styles.speedBtn} ${playbackSpeed === s ? styles.active : ""}`}
                onClick={() => setPlaybackSpeed(s)}
                aria-pressed={playbackSpeed === s}
                aria-label={`${s}x speed`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className={styles.divider} aria-hidden />

        <div className={styles.track}>
          <div className={styles.scrubberRow}>
            <div
              ref={fillRef}
              className={styles.sliderFill}
              style={{ width: `${pct}%` }}
              aria-hidden
            />

            <svg
              className={styles.markersCanvas}
              viewBox="0 0 1000 20"
              preserveAspectRatio="none"
              aria-hidden
            >
              {Array.from({ length: 11 }, (_, i) => i / 10).map((t) => (
                <rect
                  key={`decade-${t}`}
                  x={t * 1000}
                  y={0}
                  width={1}
                  height={8}
                  fill="var(--color-fg-dim)"
                  opacity={0.5}
                />
              ))}
              {TABLEAUS.map((tab) => {
                const pt = missionToDisplay(tab.tStart);
                return (
                  <g key={tab.id}>
                    <rect
                      x={pt * 1000}
                      y={0}
                      width={1}
                      height={20}
                      fill="var(--color-accent)"
                      opacity={0.55}
                    />
                    <polygon
                      points={`${pt * 1000},0 ${pt * 1000 - 3},6 ${pt * 1000},12 ${pt * 1000 + 3},6`}
                      fill="var(--color-accent)"
                      opacity={0.7}
                    />
                  </g>
                );
              })}
              {activeTableau.kind === "finale" &&
                DIVES.map((d) => {
                  const pt = missionToDisplay(d.t);
                  return (
                    <rect
                      key={`dive-${d.index}`}
                      x={pt * 1000}
                      y={11}
                      width={0.6}
                      height={9}
                      fill={
                        d.isFinalFive
                          ? "var(--color-warn, #ff6b35)"
                          : "var(--color-accent)"
                      }
                      opacity={0.55}
                    />
                  );
                })}
              <rect
                x={displayT * 1000}
                y={0}
                width={1.5}
                height={20}
                fill="var(--color-fg)"
                opacity={0.9}
              />
            </svg>

            <input
              type="range"
              min="0"
              max="1"
              step="0.0001"
              value={displayT}
              onChange={handleScrub}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
              onKeyUp={endScrub}
              onBlur={endScrub}
              className={styles.slider}
              aria-label="Mission time scrubber"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={parseFloat(pct.toFixed(1))}
              aria-valuetext={tToMissionDate(currentT)}
            />

            {activeTableau.kind === "finale" && (
              <div className={styles.diveHitRow} aria-hidden={false}>
                {DIVES.map((d) => {
                  const pt = missionToDisplay(d.t);
                  return (
                    <button
                      key={`dive-hit-${d.index}`}
                      type="button"
                      className={`${styles.diveHit}${d.isFinalFive ? ` ${styles.diveHitFinal5}` : ""}`}
                      style={{ left: `${pt * 100}%` }}
                      onClick={() => {
                        setTime(d.t);
                        useMissionStore.getState().resetCamera();
                      }}
                      title={`Dive ${d.index} / ${DIVES.length} -- ${d.date}${d.notes ? ` -- ${d.notes}` : ""}`}
                      aria-label={`Jump to dive ${d.index}, ${d.date}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={styles.divider} aria-hidden />

        <div className={styles.readout} aria-live="polite">
          <span className={styles.readoutMain}>{tToMissionDate(currentT)}</span>
          <span className={styles.readoutSub}>{tToPercent(currentT)}</span>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <div className={styles.jumpContainer}>
          <span className={styles.modelSelectLabel}>JUMP TO</span>
          <div className={styles.jumpGroup}>
            {JUMP_LABELS.map(({ label, tableauId }) => (
              <button
                key={label}
                className={styles.jumpBtn}
                onClick={() => handleJump(tableauId)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
