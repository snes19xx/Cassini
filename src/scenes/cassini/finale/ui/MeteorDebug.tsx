import { TERMINAL_TABLEAU_IDS as TERMINAL_IDS } from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import {
  METEOR_DEBUG,
  METEOR_MAX_COUNT,
  useMeteorDebugStore,
  type MeteorDebugState,
} from "../lib/meteorDebug";

interface Row {
  key: keyof MeteorDebugState;
  label: string;
  min: number;
  max: number;
  step: number;
  group: "SHOWER" | "ARC" | "STREAK" | "GLOW";
}

const ROWS: Row[] = [
  {
    key: "count",
    label: "count",
    min: 1,
    max: METEOR_MAX_COUNT,
    step: 1,
    group: "SHOWER",
  },
  {
    key: "spread",
    label: "spread",
    min: 0,
    max: 120,
    step: 1,
    group: "SHOWER",
  },
  {
    key: "splitStart",
    label: "split start",
    min: 0,
    max: 0.9,
    step: 0.01,
    group: "SHOWER",
  },
  {
    key: "elongation",
    label: "elongation",
    min: 0.2,
    max: 4,
    step: 0.05,
    group: "SHOWER",
  },
  { key: "fan", label: "fan", min: 0, max: 3, step: 0.05, group: "SHOWER" },
  // ARC: parabola shape of each fragment's drift.
  {
    key: "gravity",
    label: "gravity",
    min: 0,
    max: 2,
    step: 0.05,
    group: "ARC",
  },
  {
    key: "burstEase",
    label: "ease",
    min: 0.2,
    max: 2,
    step: 0.05,
    group: "ARC",
  },
  { key: "vBias", label: "v-bias", min: 0, max: 2, step: 0.05, group: "ARC" },
  { key: "waver", label: "waver", min: 0, max: 0.5, step: 0.01, group: "ARC" },
  {
    key: "waverFreq",
    label: "waves",
    min: 0,
    max: 16,
    step: 0.5,
    group: "ARC",
  },
  {
    key: "streakLength",
    label: "length",
    min: 4,
    max: 200,
    step: 1,
    group: "STREAK",
  },
  {
    key: "streakWidth",
    label: "width",
    min: 0.2,
    max: 8,
    step: 0.1,
    group: "STREAK",
  },
  {
    key: "headSize",
    label: "head size",
    min: 0.05,
    max: 3,
    step: 0.05,
    group: "STREAK",
  },
  {
    key: "decay",
    label: "decay",
    min: 0.2,
    max: 4,
    step: 0.05,
    group: "STREAK",
  },
  { key: "warmth", label: "warmth", min: 0, max: 1, step: 0.01, group: "GLOW" },
  {
    key: "brightness",
    label: "brightness",
    min: 1,
    max: 20,
    step: 0.1,
    group: "GLOW",
  },
  {
    key: "bloomIntensity",
    label: "bloom int",
    min: 0,
    max: 2,
    step: 0.1,
    group: "GLOW",
  },
  {
    key: "bloomThreshold",
    label: "bloom thr",
    min: 0,
    max: 6,
    step: 0.1,
    group: "GLOW",
  },
];

const GROUPS = ["SHOWER", "ARC", "STREAK", "GLOW"] as const;

/* eslint-disable react-hooks/rules-of-hooks */
// Slider panel for the meteor break-up shower: swarm, arc, streak, and glow.
export function MeteorDebug() {
  if (!METEOR_DEBUG) return null;

  const currentT = useMissionStore((s) => s.currentT);
  const state = useMeteorDebugStore();
  const inTerminal = TERMINAL_IDS.has(getActiveTableau(currentT).id);
  if (!inTerminal) return null;

  const set = state.set;

  const readout = ROWS.map((r) => {
    const v = state[r.key] as number;
    return `${String(r.key)}: ${Number.isInteger(v) ? v : v.toFixed(2)}`;
  }).join("\n");

  return (
    <div
      style={{
        position: "fixed",
        top: 110,
        left: 16,
        zIndex: 10000,
        width: 218,
        padding: "7px 9px",
        background: "#0a0e14",
        border: "1px solid rgba(255,170,90,0.45)",
        borderRadius: 6,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        color: "#ffd9b0",
        fontSize: 10,
        userSelect: "none",
        boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 11,
          marginBottom: 4,
          letterSpacing: 1,
        }}
      >
        METEOR BREAK-UP
      </div>

      {GROUPS.map((grp) => (
        <div key={grp} style={{ marginBottom: 3 }}>
          <div
            style={{
              opacity: 0.55,
              fontSize: 8.5,
              margin: "3px 0 1px",
              letterSpacing: 1,
            }}
          >
            {grp}
          </div>
          {ROWS.filter((r) => r.group === grp).map((r) => {
            const val = state[r.key] as number;
            return (
              <div
                key={String(r.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 1,
                }}
              >
                <label style={{ width: 56, fontSize: 9.5 }}>{r.label}</label>
                <input
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  value={val}
                  onChange={(e) =>
                    set({
                      [r.key]: parseFloat(e.target.value),
                    } as Partial<MeteorDebugState>)
                  }
                  style={{ flex: 1, height: 11, accentColor: "#ff9a4a" }}
                />
                <span style={{ width: 30, textAlign: "right", fontSize: 9.5 }}>
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
          height: 120,
          marginTop: 4,
          background: "rgba(0,0,0,0.55)",
          color: "#ffcfa0",
          border: "1px solid rgba(255,170,90,0.25)",
          borderRadius: 4,
          fontFamily: "inherit",
          fontSize: 9.5,
          resize: "none",
        }}
      />
      <div style={{ opacity: 0.5, fontSize: 8.5, marginTop: 3 }}>
        click box → auto-selects → copy → paste to Claude
      </div>
    </div>
  );
}
