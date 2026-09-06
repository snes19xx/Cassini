import { Suspense, lazy, useEffect, useLayoutEffect } from "react";
import { SceneErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { InfoPanel } from "./components/InfoPanel/InfoPanel";
import { SignalLost } from "./components/SignalLost/SignalLost";
import { Timeline } from "./components/Timeline/Timeline";
import { useProjectionStore } from "./hooks/useProjectedPoints";
import {
  INSPECTION_VIEWS,
  INSPECTION_VIEW_ORDER,
} from "./scenes/cassini/data/inspectionViews";
import { TERMINAL_T_START } from "./scenes/cassini/data/missionConstants";
import { Whiteout } from "./scenes/cassini/finale/parts/Whiteout";
import { CameraDebug } from "./scenes/cassini/finale/ui/CameraDebug";
import { CassiniDebug } from "./scenes/cassini/finale/ui/CassiniDebug";
import { FinaleCameraSwitcher } from "./scenes/cassini/finale/ui/FinaleCameraSwitcher";
import { FinaleDebugHUD } from "./scenes/cassini/finale/ui/FinaleDebugHUD";
import { FinaleRingsDebug } from "./scenes/cassini/finale/ui/FinaleRingsDebug";
import { MeteorDebug } from "./scenes/cassini/finale/ui/MeteorDebug";
import { RingBackdropDebug } from "./scenes/cassini/finale/ui/RingBackdropDebug";
import { infoPanelVisible, useMissionStore } from "./store/missionStore";
import styles from "./styles/App.module.css";

const LABELS_HOMEPAGE_T_EPSILON = 0.001;

const CassiniScene = lazy(() =>
  import("./scenes/cassini").then((m) => ({ default: m.CassiniScene })),
);

const MISSION_STATS = [
  { key: "HEIGHT", value: "6.7m" },
  { key: "MASS", value: "5,712kg" },
  { key: "RTGs", value: "3" },
  { key: "MISSION", value: "13yr" },
];

const VIEW_MODES = [
  { id: "blueprint", label: "BLUEPRINT", dot: "#8fd2ff" },
  { id: "space", label: "SPACE", dot: "#a4a148" },
  { id: "editorial", label: "EDITORIAL", dot: "#4f6d56" },
] as const;

type Star = {
  id: number;
  cx: number;
  cy: number;
  r: number;
  o: number;
  tone: "neutral" | "warm" | "cool";
  twinkle?: boolean;
  delay?: number;
};

function makeRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generateStars(count: number, seed: number): Star[] {
  const rand = makeRand(seed);
  const stars: Star[] = [];
  const clusterCount = Math.max(6, Math.floor(count / 18));
  type Cluster = { x: number; y: number; spread: number };
  const clusters: Cluster[] = [];
  let attempts = 0;
  while (clusters.length < clusterCount && attempts < clusterCount * 8) {
    attempts++;
    const c = { x: rand() * 100, y: rand() * 100, spread: 4 + rand() * 5 };
    if (!clusters.some((e) => Math.hypot(e.x - c.x, e.y - c.y) < 14))
      clusters.push(c);
  }
  for (const c of clusters) {
    const tone = (r: number): Star["tone"] =>
      r < 0.2 ? "warm" : r < 0.38 ? "cool" : "neutral";
    stars.push({
      id: stars.length,
      cx: c.x,
      cy: c.y,
      r: 1.3 + rand() * 0.4,
      o: 0.75 + rand() * 0.2,
      tone: tone(rand()),
    });
    const companions = 2 + Math.floor(rand() * 5);
    for (let k = 0; k < companions; k++) {
      const angle = rand() * Math.PI * 2,
        dist = rand() * c.spread;
      stars.push({
        id: stars.length,
        cx: Math.max(0, Math.min(100, c.x + Math.cos(angle) * dist)),
        cy: Math.max(0, Math.min(100, c.y + Math.sin(angle) * dist)),
        r: 0.4 + rand() * 0.4,
        o: 0.35 + rand() * 0.45,
        tone: tone(rand()),
      });
    }
  }
  while (stars.length < count) {
    const tone = (r: number): Star["tone"] =>
      r < 0.2 ? "warm" : r < 0.38 ? "cool" : "neutral";
    stars.push({
      id: stars.length,
      cx: rand() * 100,
      cy: rand() * 100,
      r: rand() < 0.08 ? 0.9 : 0.4,
      o: 0.18 + rand() * 0.3,
      tone: tone(rand()),
    });
  }
  for (const s of stars) {
    if (rand() < 0.08) {
      s.twinkle = true;
      s.delay = rand() * 6;
    }
  }
  return stars;
}

const STARS = generateStars(140, 0xca551_011);

function InspectionViewBar() {
  const show = useMissionStore(
    (s) => s.showLabels && s.currentT < LABELS_HOMEPAGE_T_EPSILON,
  );
  const activeView = useMissionStore((s) => s.inspectionView);
  const setInspectionView = useMissionStore((s) => s.setInspectionView);

  if (!show) return null;

  return (
    <div
      className={styles.inspectionBar}
      role="group"
      aria-label="Inspection views"
    >
      {INSPECTION_VIEW_ORDER.map((id) => {
        const view = INSPECTION_VIEWS[id];
        const isActive = activeView === id;
        return (
          <button
            key={id}
            type="button"
            className={`${styles.inspectionBtn}${isActive ? ` ${styles.inspectionBtnActive}` : ""}`}
            onClick={() => setInspectionView(id)}
            aria-pressed={isActive}
            title={view.hint}
          >
            <span className={styles.inspectionBtnLabel}>{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function InfoPanelGate() {
  const show = useMissionStore((s) => infoPanelVisible(s));
  if (!show) return null;
  return <InfoPanel />;
}

const SCALE_METERS = [0, 2, 4, 6];

function ScaleReference() {
  const projections = useProjectionStore((s) => s.projections);
  const viewport = useProjectionStore((s) => s.viewport);

  if (viewport.width < 768) return null;

  const SAFE_TOP = 160;
  const SAFE_BOTTOM = 140;

  const ticks = SCALE_METERS.map((m) => {
    const p = projections[`scale:${m}`];
    if (!p || !p.onScreen) return null;
    if (p.y < SAFE_TOP || p.y > viewport.height - SAFE_BOTTOM) return null;
    return { m, y: Math.round(p.y) };
  }).filter((t): t is { m: number; y: number } => t !== null);

  if (ticks.length < 2) return null;

  const topY = Math.min(...ticks.map((t) => t.y));
  const bottomY = Math.max(...ticks.map((t) => t.y));

  const paddingX = Math.min(28, Math.max(12, viewport.width * 0.02));
  const colX = viewport.width - paddingX;

  return (
    <svg
      className={styles.scaleRef}
      aria-hidden
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      width={viewport.width}
      height={viewport.height}
    >
      <line
        className={styles.scaleRefLine}
        x1={colX}
        x2={colX}
        y1={topY}
        y2={bottomY}
      />
      {ticks.map(({ m, y }) => (
        <g key={m} transform={`translate(${colX} ${y})`}>
          <line className={styles.scaleRefDash} x1={0} x2={-12} y1={0} y2={0} />
          <text className={styles.scaleRefLabel} x={-18} y={4} textAnchor="end">
            {String(m).padStart(2, "0")}m
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function App() {
  const renderMode = useMissionStore((s) => s.renderMode);
  const showLabels = useMissionStore((s) => s.showLabels);
  const reset = useMissionStore((s) => s.reset);
  const setRenderMode = useMissionStore((s) => s.setRenderMode);
  const toggleLabels = useMissionStore((s) => s.toggleLabels);
  const isBlueprint = renderMode === "blueprint";
  const isEditorial = renderMode === "editorial";
  const showStars = renderMode === "space";

  const inTerminalPhase = useMissionStore(
    (s) => s.currentT >= TERMINAL_T_START,
  );
  useEffect(() => {
    const s = useMissionStore.getState();
    if (inTerminalPhase) s.enterTerminalTheme();
    else s.exitTerminalTheme();
  }, [inTerminalPhase]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = renderMode;
  }, [renderMode]);

  return (
    <main
      className={styles.root}
      data-theme={renderMode}
      data-terminal={inTerminalPhase || undefined}
    >
      <div
        className={`${styles.scene}${isBlueprint ? ` ${styles.sceneBlueprint}` : ""}${
          isEditorial ? ` ${styles.sceneEditorial}` : ""
        }`}
      >
        {showStars && (
          <svg className={styles.starfield} aria-hidden>
            {STARS.map((s) => {
              const toneClass =
                s.tone === "warm"
                  ? styles.starWarm
                  : s.tone === "cool"
                    ? styles.starCool
                    : styles.star;
              const cls = s.twinkle
                ? `${toneClass} ${styles.starTwinkle}`
                : toneClass;
              return (
                <circle
                  key={s.id}
                  cx={`${s.cx}%`}
                  cy={`${s.cy}%`}
                  r={s.r}
                  opacity={s.o}
                  className={cls}
                  style={
                    s.twinkle
                      ? { animationDelay: `${s.delay ?? 0}s` }
                      : undefined
                  }
                />
              );
            })}
          </svg>
        )}
        <div className={styles.sceneCanvas}>
          <SceneErrorBoundary onReset={reset}>
            <Suspense fallback={null}>
              <CassiniScene />
            </Suspense>
          </SceneErrorBoundary>
        </div>
      </div>

      <div className={styles.vignette} />

      <ScaleReference />

      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>CASSINI</h1>
          <p className={styles.attribution}>
            SOURCES: <strong className={styles.nasa}>NASA</strong> ·{" "}
            <strong className={styles.esa}>ESA</strong> ·{" "}
            <strong className={styles.jpl}>JPL</strong> ·{" "}
            <a
              href="https://snes19xx.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.snesLink}
            >
              BY SNES
            </a>
          </p>
        </div>

        <div
          className={styles.viewSwitcher}
          role="group"
          aria-label="View mode"
        >
          {VIEW_MODES.map((v) => {
            const locked = v.id === "blueprint" && inTerminalPhase;
            return (
              <button
                key={v.id}
                type="button"
                className={`${styles.viewBtn}${renderMode === v.id ? ` ${styles.viewBtnActive}` : ""}`}
                onClick={() => setRenderMode(v.id as typeof renderMode)}
                aria-pressed={renderMode === v.id}
                disabled={locked}
                title={
                  locked
                    ? "Blueprint is unavailable during the terminal descent"
                    : undefined
                }
              >
                <span
                  className={styles.viewDot}
                  style={{
                    background: renderMode === v.id ? "currentColor" : v.dot,
                  }}
                />
                {v.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className={styles.topRight}>
        <div className={styles.statsBar} aria-label="Mission statistics">
          {MISSION_STATS.map((s) => (
            <div key={s.key} className={styles.stat}>
              <span className={styles.statKey}>{s.key}</span>
              <span className={styles.statValue}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className={styles.chromeControls}>
          <button
            type="button"
            className={`${styles.chromeBtn}${showLabels ? ` ${styles.chromeBtnActive}` : ""}`}
            onClick={toggleLabels}
            aria-pressed={showLabels}
            title="Toggle labels overlay"
          >
            LABELS
          </button>
        </div>
      </div>

      <InspectionViewBar />

      <InfoPanelGate />
      <Whiteout />
      <Timeline />
      <SignalLost />
      <FinaleCameraSwitcher />
      <FinaleDebugHUD />
      <RingBackdropDebug />
      <CameraDebug />
      <CassiniDebug />
      <FinaleRingsDebug />
      <MeteorDebug />
    </main>
  );
}
