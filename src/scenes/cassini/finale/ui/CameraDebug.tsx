import { TERMINAL_TABLEAU_IDS as TERMINAL_IDS } from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import {
  CAMERA_DEBUG,
  useCameraDebugStore,
  type CameraDebugState,
} from "../lib/cameraDebug";

interface Row {
  key: keyof CameraDebugState;
  label: string;
  min: number;
  max: number;
  step: number;
}

const ROWS: Row[] = [
  { key: "posX", label: "pos X", min: -400, max: 400, step: 1 },
  { key: "posY", label: "pos Y (height)", min: -100, max: 300, step: 1 },
  { key: "posZ", label: "pos Z", min: -400, max: 400, step: 1 },
  { key: "pitchDeg", label: "pitch ↑↓°", min: -45, max: 45, step: 0.5 },
  { key: "yawDeg", label: "yaw ←→°", min: -90, max: 90, step: 0.5 },
  { key: "fov", label: "fov", min: 20, max: 100, step: 1 },
];

/* eslint-disable react-hooks/rules-of-hooks */
// Slider panel for the locked terminal hero camera, frames the stage manually.
export function CameraDebug() {
  if (!CAMERA_DEBUG) return null;

  const currentT = useMissionStore((s) => s.currentT);
  const state = useCameraDebugStore();
  const inTerminal = TERMINAL_IDS.has(getActiveTableau(currentT).id);
  if (!inTerminal) return null;

  const set = state.set;

  const readout = [
    `posX: ${state.posX}`,
    `posY: ${state.posY}`,
    `posZ: ${state.posZ}`,
    `pitchDeg: ${state.pitchDeg}`,
    `yawDeg: ${state.yawDeg}`,
    `fov: ${state.fov}`,
  ].join("\n");

  return (
    <div
      style={{
        position: "fixed",
        top: 120,
        left: 20,
        zIndex: 10000,
        width: 270,
        padding: "12px 14px",
        background: "rgba(8,12,18,0.82)",
        border: "1px solid rgba(255,200,120,0.35)",
        borderRadius: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        color: "#ffe2bf",
        fontSize: 12,
        userSelect: "none",
        boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 13,
          marginBottom: 8,
          letterSpacing: 1,
        }}
      >
        CAMERA / STAGE
      </div>

      {ROWS.map((r) => {
        const val = state[r.key] as number;
        return (
          <div
            key={r.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 3,
            }}
          >
            <label style={{ width: 92, fontSize: 11 }}>{r.label}</label>
            <input
              type="range"
              min={r.min}
              max={r.max}
              step={r.step}
              value={val}
              onChange={(e) =>
                set({
                  [r.key]: parseFloat(e.target.value),
                } as Partial<CameraDebugState>)
              }
              style={{ flex: 1, accentColor: "#ffb454" }}
            />
            <span style={{ width: 42, textAlign: "right", fontSize: 11 }}>
              {Number.isInteger(val) ? val : val.toFixed(1)}
            </span>
          </div>
        );
      })}

      <textarea
        readOnly
        value={readout}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          width: "100%",
          height: 78,
          marginTop: 8,
          background: "rgba(0,0,0,0.45)",
          color: "#ffd9a8",
          border: "1px solid rgba(255,200,120,0.2)",
          borderRadius: 4,
          fontFamily: "inherit",
          fontSize: 10.5,
          resize: "none",
        }}
      />
      <div style={{ opacity: 0.5, fontSize: 9.5, marginTop: 4 }}>
        click box → auto-selects → copy → paste to Claude
      </div>
    </div>
  );
}
