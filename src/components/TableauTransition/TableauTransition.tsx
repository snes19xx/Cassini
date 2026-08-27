// src/components/TableauTransition/TableauTransition.tsx
//
// Theme-tinted veil that flashes on a manual jump (tableauId and
// cameraResetNonce both changing in the same render). Natural scrub or
// playback across a boundary is handled by TransitionDriver's camera fly
// and never mounts this overlay.

import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import { useEffect, useRef, useState } from "react";
import styles from "../../styles/App.module.css";

export function TableauTransition() {
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);
  const cameraResetNonce = useMissionStore((s) => s.cameraResetNonce);
  const lastIdRef = useRef(tableauId);
  const lastNonceRef = useRef(cameraResetNonce);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const idChanged = tableauId !== lastIdRef.current;
    const nonceChanged = cameraResetNonce !== lastNonceRef.current;
    lastIdRef.current = tableauId;
    lastNonceRef.current = cameraResetNonce;
    if (idChanged && nonceChanged) {
      setAnimKey((k) => k + 1);
    }
  }, [tableauId, cameraResetNonce]);

  // animKey 0 is the initial mount; skip it so the first paint isn't dimmed.
  if (animKey === 0) return null;

  return <div key={animKey} className={styles.tableauVeil} aria-hidden />;
}
