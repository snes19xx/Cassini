import { Suspense, lazy } from "react";
import { SceneErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import styles from "./styles/App.module.css";

const CassiniScene = lazy(() =>
  import("./scenes/cassini").then((m) => ({ default: m.CassiniScene })),
);

export default function App() {
  return (
    <div className={styles.root}>
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <CassiniScene />
        </Suspense>
      </SceneErrorBoundary>
    </div>
  );
}
