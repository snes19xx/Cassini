import { Suspense, lazy } from "react";
import { SceneErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { InfoPanel } from "./components/InfoPanel/InfoPanel";
import { Timeline } from "./components/Timeline/Timeline";
import { infoPanelVisible, useMissionStore } from "./store/missionStore";
import styles from "./styles/App.module.css";

const CassiniScene = lazy(() =>
  import("./scenes/cassini").then((m) => ({ default: m.CassiniScene })),
);

export default function App() {
  const infoPanelOn = useMissionStore((s) => infoPanelVisible(s));

  return (
    <div className={styles.root}>
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <CassiniScene />
        </Suspense>
      </SceneErrorBoundary>
      {infoPanelOn && <InfoPanel />}
      <Timeline />
    </div>
  );
}
