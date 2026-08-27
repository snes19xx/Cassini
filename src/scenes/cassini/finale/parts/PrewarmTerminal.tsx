// src/scenes/cassini/finale/parts/PrewarmTerminal.tsx
//
// Idle-time shader pre-warm for the terminal subtree, so the ~1s compile
// stall on SATURN'S ATMOSPHERE entry pays at browser idle instead.

import { Trail } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useMissionStore } from "../../../../store/missionStore";
import { isTerminalTableau } from "../../data/missionConstants";
import { getActiveTableau } from "../../data/tableaus";
import { createTerminalDeckMaterial } from "../../parts/SaturnBody";
import { CassiniTrail } from "./CassiniTrail";
import { RingBackdrop } from "./RingBackdrop";
import { SkyDome } from "./SkyDome";

let warmed = false;

type Phase = "pending" | "warming" | "done";

// Keeps the warm out of the opening settle, after texture decodes and
// first-paint shader compiles.
const WARM_HOLDOFF_MS = 8000;
const COMPILE_BUDGET_MS = 1500;

/** Resolves when `p` settles or the budget expires; never rejects, never hangs. */
function withBudget(p: Promise<unknown>, budgetMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, budgetMs);
    const settle = () => {
      clearTimeout(timer);
      resolve();
    };
    p.then(settle, settle);
  });
}

export function PrewarmTerminal() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  const [phase, setPhase] = useState<Phase>(warmed ? "done" : "pending");
  const groupRef = useRef<THREE.Group>(null);
  const compiledRef = useRef(false);
  const warmFramesRef = useRef(0);

  const deckMaterial = useMemo(() => createTerminalDeckMaterial(), []);
  useEffect(() => () => deckMaterial.dispose(), [deckMaterial]);

  useEffect(() => {
    if (warmed) return;
    let cancelled = false;
    const kick = () => {
      if (cancelled || warmed) return;
      const t = useMissionStore.getState().currentT;
      if (isTerminalTableau(getActiveTableau(t).id)) {
        warmed = true;
        setPhase("done");
        return;
      }
      setPhase("warming");
    };
    let idleId: number | undefined;
    let idleTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const holdId = setTimeout(() => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(kick, { timeout: 8000 });
      } else {
        idleTimeoutId = setTimeout(kick, 1000);
      }
    }, WARM_HOLDOFF_MS);
    return () => {
      cancelled = true;
      clearTimeout(holdId);
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (idleTimeoutId !== undefined) clearTimeout(idleTimeoutId);
    };
  }, []);

  // Compile the warm subtree, then the live scene with a zero-intensity
  // directional light added: TerminalSunFill's mount at terminal entry
  // bumps the light count, forcing every lit material to recompile right
  // at the cut, so this pass caches that +1-light permutation ahead of time.
  useEffect(() => {
    if (phase !== "warming") return;
    let cancelled = false;
    const group = groupRef.current;
    (async () => {
      try {
        if (group) {
          await withBudget(
            gl.compileAsync(group, camera, scene),
            COMPILE_BUDGET_MS,
          );
        }
        const fill = new THREE.DirectionalLight("#ffffff", 0);
        fill.layers.enable(0);
        fill.layers.enable(1);
        scene.add(fill);
        try {
          await withBudget(gl.compileAsync(scene, camera), COMPILE_BUDGET_MS);
        } finally {
          scene.remove(fill);
          fill.dispose();
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[PrewarmTerminal] compile pass failed", err);
        }
      } finally {
        if (!cancelled) compiledRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, gl, camera, scene]);

  useFrame(() => {
    if (phase !== "warming") return;
    warmFramesRef.current += 1;
    if (compiledRef.current && warmFramesRef.current >= 4) {
      warmed = true;
      setPhase("done");
    }
  });

  if (phase !== "warming") return null;

  return (
    <group ref={groupRef} visible={false}>
      <SkyDome />
      <RingBackdrop />
      <CassiniTrail />
      <mesh material={deckMaterial}>
        <sphereGeometry args={[1, 8, 4]} />
      </mesh>
      <Trail width={1} color="#ffffff" length={2} decay={1} local={false}>
        <mesh>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshBasicMaterial transparent depthWrite={false} />
        </mesh>
      </Trail>
    </group>
  );
}
