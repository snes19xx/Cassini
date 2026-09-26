import { useThrottledMissionT } from "@/hooks/useThrottledMissionT";
import { formatMissionDate } from "@/scenes/cassini/data/missionDates";
import { SEEK_MAX_T, clampSeekT } from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { DIVES } from "@/scenes/cassini/finale/data/diveTable";
import { PlaybackSpeed, useMissionStore } from "@/store/missionStore";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AxisLayout, GEO, computeAxisLayout } from "./axisLayout";
import {
  BRACKETS,
  STOPS,
  axisT,
  axisX,
  bracketMembers,
  stopAt,
} from "./axisModel";
import styles from "./Timeline.module.css";

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

const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10];

// Arrow-key step, in axis units.
const KEY_STEP = 0.005;
const KEY_STEP_COARSE = 0.05;

export function Timeline() {
  // 12 Hz during playback; dragT drives the head at full rate while scrubbing.
  const currentT = useThrottledMissionT(12);
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const setTime = useMissionStore((s) => s.setTime);
  const togglePlay = useMissionStore((s) => s.togglePlay);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);

  const [dragT, setDragT] = useState<number | null>(null);
  const t = dragT ?? currentT;

  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLElement | null>>({});
  const laidOutWidth = useRef(0);
  const [layout, setLayout] = useState<AxisLayout | null>(null);

  const remeasure = useCallback((force = false) => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth;
    if (!width || (!force && width === laidOutWidth.current)) return;
    laidOutWidth.current = width;
    const widths: Record<string, number> = {};
    for (const [id, node] of Object.entries(labelRefs.current)) {
      if (node) widths[id] = node.offsetWidth;
    }
    setLayout(computeAxisLayout(width, widths));
  }, []);

  useLayoutEffect(() => {
    remeasure(true);
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => remeasure());
    ro.observe(track);
    return () => ro.disconnect();
  }, [remeasure]);

  // Remeasure once the mono face has loaded.
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) remeasure(true);
    });
    return () => {
      live = false;
    };
  }, [remeasure]);

  const jump = useCallback(
    (target: number) => {
      setTime(clampSeekT(target));
      useMissionStore.getState().resetCamera();
    },
    [setTime],
  );

  const seek = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return;
      const r = rail.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const next = clampSeekT(axisT(x));
      setDragT(next);
      setTime(next);
    },
    [setTime],
  );

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // preventDefault costs the rail its click focus.
    e.currentTarget.focus();
    useMissionStore.setState({ isPlaying: false });
    seek(e.clientX);
  };

  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seek(e.clientX);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragT(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_STEP_COARSE : KEY_STEP;
    const x = axisX(useMissionStore.getState().currentT);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = axisT(x + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      next = axisT(x - step);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = SEEK_MAX_T;
    if (next === null) return;
    e.preventDefault();
    // App.tsx binds the arrows to tableau steps.
    e.stopPropagation();
    setTime(clampSeekT(next));
  };

  const brackets = useMemo(
    () =>
      BRACKETS.map((b) => ({ ...b, jumpT: bracketMembers(b.id)[0]!.jumpT })),
    [],
  );

  const activeTableau = getActiveTableau(currentT);
  const activeStop = stopAt(t);
  const headX = axisX(t) * 100;
  const annH = layout?.annH ?? GEO.annH;
  const stamp = formatMissionDate(t, activeTableau.id);

  const place = (id: string): React.CSSProperties => {
    const slot = layout?.slots[id];
    if (!slot) return { left: 0, bottom: 0, visibility: "hidden" };
    return {
      left: slot.x,
      bottom: slot.bottom,
      visibility: slot.hidden ? "hidden" : "visible",
    };
  };

  const ruleClass = (on: boolean) =>
    `${styles.rule}${on ? ` ${styles.ruleOn}` : ""}`;

  return (
    <div className={styles.wrapper} role="region" aria-label="Mission timeline">
      <div className={styles.axis}>
        <div className={styles.left}>
          <div className={styles.phase} aria-live="polite">
            {activeTableau.label}
          </div>
          <div className={styles.stamp}>{stamp}</div>

          <div className={styles.transport}>
            <button
              type="button"
              className={styles.play}
              onClick={togglePlay}
              aria-label={
                isPlaying ? "Pause mission playback" : "Play mission playback"
              }
            >
              {isPlaying ? <IconPause /> : <IconPlay />}
              <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
            </button>

            <div
              className={styles.speeds}
              role="group"
              aria-label="Playback speed"
            >
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.speed}${playbackSpeed === s ? ` ${styles.speedOn}` : ""}`}
                  onClick={() => setPlaybackSpeed(s)}
                  aria-pressed={playbackSpeed === s}
                  aria-label={`${s}x speed`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --ann-h lets the rail's grab area reach up over the band. */}
        <div
          className={styles.track}
          ref={trackRef}
          style={{ "--ann-h": `${annH}px` } as React.CSSProperties}
        >
          <div className={styles.ann} style={{ height: annH }}>
            {layout && (
              <svg
                className={styles.stems}
                viewBox={`0 0 ${layout.width} ${layout.annH}`}
                preserveAspectRatio="none"
                aria-hidden
              >
                {STOPS.map((s) =>
                  layout.slots[s.id] ? (
                    <path
                      key={s.id}
                      d={layout.slots[s.id]!.stem}
                      className={ruleClass(activeStop?.id === s.id)}
                    />
                  ) : null,
                )}
                {brackets.map((b) =>
                  layout.slots[b.id] ? (
                    <path
                      key={b.id}
                      d={layout.slots[b.id]!.stem}
                      className={ruleClass(t >= b.t0 && t < b.t1)}
                    />
                  ) : null,
                )}
              </svg>
            )}

            {brackets.map((b) => (
              <button
                key={b.id}
                type="button"
                ref={(node) => {
                  labelRefs.current[b.id] = node;
                }}
                className={`${styles.lab} ${styles.chapter}${t >= b.t0 && t < b.t1 ? ` ${styles.labOn}` : ""}`}
                style={place(b.id)}
                onClick={() => jump(b.jumpT)}
              >
                {b.label}
              </button>
            ))}

            {STOPS.map((s) => (
              <button
                key={s.id}
                type="button"
                ref={(node) => {
                  labelRefs.current[s.id] = node;
                }}
                className={`${styles.lab} ${s.tier === "chapter" ? styles.major : styles.minor}${activeStop?.id === s.id ? ` ${styles.labOn}` : ""}`}
                style={place(s.id)}
                onClick={() => jump(s.jumpT)}
              >
                {s.label}
                <span className={styles.tip}>
                  {s.label} {formatMissionDate(s.t)}
                </span>
              </button>
            ))}
          </div>

          <div
            ref={railRef}
            className={styles.rail}
            role="slider"
            tabIndex={0}
            aria-label="Mission time scrubber"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(headX.toFixed(1))}
            aria-valuetext={stamp}
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
          >
            <div
              className={styles.progress}
              style={{ width: `${headX}%` }}
              aria-hidden
            />
            {layout?.years.map((y) => (
              <Fragment key={y.year}>
                <div
                  className={`${styles.year}${y.labeled ? ` ${styles.yearMajor}` : ""}`}
                  style={{ left: y.x }}
                  aria-hidden
                />
                {y.labeled && (
                  <div className={styles.yearLabel} style={{ left: y.x }}>
                    {y.year}
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {activeTableau.kind === "finale" && (
            <div className={styles.dives}>
              {DIVES.map((d) => (
                <button
                  key={d.index}
                  type="button"
                  className={`${styles.dive}${d.isFinalFive ? ` ${styles.diveFinal}` : ""}`}
                  style={{ left: `${axisX(d.t) * 100}%` }}
                  onClick={() => jump(d.t)}
                  title={`Dive ${d.index} / ${DIVES.length} -- ${d.date}${d.notes ? ` -- ${d.notes}` : ""}`}
                  aria-label={`Jump to dive ${d.index}, ${d.date}`}
                >
                  <span className={styles.diveTick} aria-hidden />
                </button>
              ))}
            </div>
          )}

          <div
            className={styles.head}
            style={{ left: `${headX}%`, height: annH + 8 }}
            aria-hidden
          />
          <div
            className={styles.knob}
            style={{ left: `${headX}%`, top: annH }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
