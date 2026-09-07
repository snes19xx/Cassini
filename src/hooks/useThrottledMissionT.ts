import { useEffect, useState } from "react";
import { useMissionStore } from "@/store/missionStore";

// throttles react re-renders only, the store still updates every frame
export function useThrottledMissionT(hz = 12): number {
  const [t, setT] = useState(() => useMissionStore.getState().currentT);

  useEffect(() => {
    const intervalMs = 1000 / hz;
    let lastCommitMs = 0;
    let latest = useMissionStore.getState().currentT;
    let rafId = 0;

    const commit = () => {
      lastCommitMs = performance.now();
      setT(latest);
    };

    // keep polling until the throttle window closes, then land the value
    const trail = () => {
      if (performance.now() - lastCommitMs >= intervalMs) {
        rafId = 0;
        commit();
      } else {
        rafId = requestAnimationFrame(trail);
      }
    };

    // no subscribeWithSelector on this store, select currentT by hand
    const unsub = useMissionStore.subscribe((s) => {
      if (s.currentT === latest) return;
      latest = s.currentT;
      if (performance.now() - lastCommitMs >= intervalMs) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        commit();
      } else if (!rafId) {
        rafId = requestAnimationFrame(trail);
      }
    });

    // catch up in case currentT moved before this ran
    commit();

    return () => {
      unsub();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [hz]);

  return t;
}
