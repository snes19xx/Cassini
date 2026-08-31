import { TERMINAL_TABLEAU_IDS as TERMINAL_IDS } from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import {
  CASSINI_PATH_DEBUG,
  useCassiniDebugStore,
  type CassiniDebugState,
} from "../lib/cassiniDebug";

interface Row {
  key: keyof CassiniDebugState;
  label: string;
  min: number;
  max: number;
  step: number;
  group: "TRAIL" | "BREAK-UP";
}

// Only TRAIL and BREAK-UP are here, PATH is locked.
const ROWS: Row[] = [
  {
    key: "trailOpacity",
    label: "opacity",
    min: 0,
    max: 1,
    step: 0.01,
    group: "TRAIL",
  },
  {
    key: "trailWidth",
    label: "width",
    min: 0.1,
    max: 12,
    step: 0.1,
    group: "TRAIL",
  },
  {
    key: "trailLength",
    label: "length",
    min: 50,
    max: 1500,
    step: 10,
    group: "TRAIL",
  },
  {
    key: "trailWander",
    label: "wander",
    min: 0,
    max: 40,
    step: 0.5,
    group: "TRAIL",
  },
  // Smaller shrinkSpan = a faster break-up.
  {
    key: "meteorShrinkStart",
    label: "shrink start",
    min: 0.5,
    max: 1.0,
    step: 0.01,
    group: "BREAK-UP",
  },
  {
    key: "meteorShrinkSpan",
    label: "shrink span",
    min: 0.02,
    max: 0.5,
    step: 0.01,
    group: "BREAK-UP",
  },
  {
    key: "meteorMinScale",
    label: "min size",
    min: 0,
    max: 1,
    step: 0.05,
    group: "BREAK-UP",
  },
  {
    key: "meteorMinOpacity",
    label: "min opacity",
    min: 0,
    max: 1,
    step: 0.05,
    group: "BREAK-UP",
  },
];

/* eslint-disable react-hooks/rules-of-hooks */
// Slider panel for Cassini's terminal plunge trail and meteor break-up.
export function CassiniDebug() {
  if (!CASSINI_PATH_DEBUG) return null;

  const currentT = useMissionStore((s) => s.currentT);
  const state = useCassiniDebugStore();
  const inTerminal = TERMINAL_IDS.has(getActiveTableau(currentT).id);
  if (!inTerminal) return null;

  const set = state.set;

  const readout = [
    `trailOpacity: ${state.trailOpacity}`,
    `trailWidth: ${state.trailWidth}`,
    `trailLength: ${state.trailLength}`,
    `trailWander: ${state.trailWander}`,
    `meteorShrinkStart: ${state.meteorShrinkStart}`,
    `meteorShrinkSpan: ${state.meteorShrinkSpan}`,
    `meteorMinScale: ${state.meteorMinScale}`,
    `meteorMinOpacity: ${state.meteorMinOpacity}`,
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
        border: "1px solid rgba(150,255,180,0.35)",
        borderRadius: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        color: "#cdffd9",
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
        CASSINI TRAIL + BREAK-UP
      </div>

      {(["TRAIL", "BREAK-UP"] as const).map((grp) => (
        <div key={grp} style={{ marginBottom: 8 }}>
          <div
            style={{
              opacity: 0.6,
              fontSize: 10,
              margin: "6px 0 2px",
              letterSpacing: 1,
            }}
          >
            {grp}
          </div>
          {ROWS.filter((r) => r.group === grp).map((r) => {
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
                <label style={{ width: 78, fontSize: 11 }}>{r.label}</label>
                <input
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  value={val}
                  onChange={(e) =>
                    set({
                      [r.key]: parseFloat(e.target.value),
                    } as Partial<CassiniDebugState>)
                  }
                  style={{ flex: 1, accentColor: "#7CFCA0" }}
                />
                <span style={{ width: 42, textAlign: "right", fontSize: 11 }}>
                  {Number.isInteger(val) ? val : val.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      <textarea
        readOnly
        value={readout}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          width: "100%",
          height: 110,
          marginTop: 6,
          background: "rgba(0,0,0,0.45)",
          color: "#aef0bf",
          border: "1px solid rgba(150,255,180,0.2)",
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
