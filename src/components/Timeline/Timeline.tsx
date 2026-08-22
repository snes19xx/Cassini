import {
  ActiveModel,
  PlaybackSpeed,
  useMissionStore,
} from "@/store/missionStore";
import { useCallback, useRef } from "react";
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

const MODEL_OPTIONS: { id: ActiveModel; label: string }[] = [
  { id: "CassiniHuygensA.glb", label: "TRUECOLOR" },
  { id: "CassiniHuygensAwithout_Cassini.glb", label: "HUYGENS ONLY" },
  { id: "CassiniHuygensAwithoutHyugens.glb", label: "CASSINI ONLY" },
];

//  Component

export function Timeline() {
  const currentT = useMissionStore((s) => s.currentT);
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const activeModel = useMissionStore((s) => s.activeModel);

  const setTime = useMissionStore((s) => s.setTime);
  const togglePlay = useMissionStore((s) => s.togglePlay);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);
  const setActiveModel = useMissionStore((s) => s.setActiveModel);

  const fillRef = useRef<HTMLDivElement>(null);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = parseFloat(e.target.value);
      setTime(t);
      if (fillRef.current) {
        fillRef.current.style.width = `${t * 100}%`;
      }
    },
    [setTime],
  );

  const pct = currentT * 100;

  return (
    <div className={styles.wrapper} role="region" aria-label="Mission timeline">
      {/*Transport & Speed*/}
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

      {/* Scrubber track */}
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
            <rect
              x={currentT * 1000}
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
            value={currentT}
            onChange={handleScrub}
            className={styles.slider}
            aria-label="Mission time scrubber"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={parseFloat(pct.toFixed(1))}
            aria-valuetext={tToMissionDate(currentT)}
          />
        </div>
      </div>

      <div className={styles.divider} aria-hidden />

      {/*  Model Selector  */}
      <div className={styles.modelSelectContainer}>
        <span className={styles.modelSelectLabel}>MODEL</span>
        <div className={styles.modelSelectWrapper}>
          <select
            value={activeModel}
            onChange={(e) => setActiveModel(e.target.value as ActiveModel)}
            className={styles.modelSelect}
            aria-label="Select 3D Model"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className={styles.modelSelectIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <div className={styles.divider} aria-hidden />

      {/*Right readout*/}
      <div className={styles.readout} aria-live="polite">
        <span className={styles.readoutMain}>{tToMissionDate(currentT)}</span>
        <span className={styles.readoutSub}>{tToPercent(currentT)}</span>
      </div>
    </div>
  );
}
