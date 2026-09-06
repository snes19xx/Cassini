import { Suspense, lazy, useLayoutEffect } from "react";
import { SceneErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { InfoPanel } from "./components/InfoPanel/InfoPanel";
import { SignalLost } from "./components/SignalLost/SignalLost";
import { Timeline } from "./components/Timeline/Timeline";
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

export default function App() {
  const renderMode = useMissionStore((s) => s.renderMode);
  const infoPanelOn = useMissionStore((s) => infoPanelVisible(s));
  const reset = useMissionStore((s) => s.reset);
  const setRenderMode = useMissionStore((s) => s.setRenderMode);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = renderMode;
  }, [renderMode]);

  return (
    <main className={styles.root} data-theme={renderMode}>
      <div className={styles.scene}>
        <div className={styles.sceneCanvas}>
          <SceneErrorBoundary onReset={reset}>
            <Suspense fallback={null}>
              <CassiniScene />
            </Suspense>
          </SceneErrorBoundary>
        </div>
      </div>

      <div className={styles.vignette} />

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
          {VIEW_MODES.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`${styles.viewBtn}${renderMode === v.id ? ` ${styles.viewBtnActive}` : ""}`}
              onClick={() => setRenderMode(v.id as typeof renderMode)}
              aria-pressed={renderMode === v.id}
            >
              <span
                className={styles.viewDot}
                style={{
                  background: renderMode === v.id ? "currentColor" : v.dot,
                }}
              />
              {v.label}
            </button>
          ))}
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
      </div>

      {infoPanelOn && <InfoPanel />}
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
