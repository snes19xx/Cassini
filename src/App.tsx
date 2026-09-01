import { Suspense, lazy } from "react";
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
    </div>
  );
}
