import { TERMINAL_TABLEAU_IDS as TERMINAL_IDS } from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import {
  RING_BACKDROP_DEBUG,
  useRingBackdropStore,
  type RingBackdropState,
} from "../lib/ringBackdropDebug";

interface Row {
  key: keyof RingBackdropState;
  label: string;
  min: number;
  max: number;
  step: number;
  group: "CARD" | "BAKE";
}

const ROWS: Row[] = [
  {
    key: "offsetRight",
    label: "offset ←→",
    min: -800,
    max: 800,
    step: 1,
    group: "CARD",
  },
  {
    key: "offsetUp",
    label: "offset ↑↓",
    min: -400,
    max: 600,
    step: 1,
    group: "CARD",
  },
  {
    key: "distance",
    label: "distance",
    min: 150,
    max: 2000,
    step: 5,
    group: "CARD",
  },
  {
    key: "rollDeg",
    label: "tilt (roll°)",
    min: -90,
    max: 90,
    step: 0.5,
    group: "CARD",
  },
  { key: "scaleX", label: "width", min: 20, max: 1200, step: 2, group: "CARD" },
  {
    key: "scaleY",
    label: "height",
    min: 20,
    max: 1600,
    step: 2,
    group: "CARD",
  },
  {
    key: "topTaper",
    label: "top width",
    min: 0.1,
    max: 2.5,
    step: 0.01,
    group: "CARD",
  },
  {
    key: "bottomTaper",
    label: "bottom width",
    min: 0.1,
    max: 2.5,
    step: 0.01,
    group: "CARD",
  },
  {
    key: "curvature",
    label: "curvature",
    min: -1.5,
    max: 1.5,
    step: 0.01,
    group: "CARD",
  },
  {
    key: "opacity",
    label: "opacity",
    min: 0,
    max: 1,
    step: 0.01,
    group: "CARD",
  },
  {
    key: "horizonClip",
    label: "horizon clip",
    min: -300,
    max: 300,
    step: 1,
    group: "CARD",
  },
  {
    key: "innerFadeStart",
    label: "inner fade a",
    min: 0,
    max: 0.6,
    step: 0.005,
    group: "CARD",
  },
  {
    key: "innerFadeEnd",
    label: "inner fade b",
    min: 0,
    max: 0.6,
    step: 0.005,
    group: "CARD",
  },
  {
    key: "bakeElev",
    label: "bake elev",
    min: 1,
    max: 200,
    step: 1,
    group: "BAKE",
  },
  {
    key: "bakeReach",
    label: "bake reach",
    min: 50,
    max: 1000,
    step: 5,
    group: "BAKE",
  },
  {
    key: "bakeFov",
    label: "bake fov",
    min: 10,
    max: 110,
    step: 1,
    group: "BAKE",
  },
  {
    key: "bakeBrightness",
    label: "bake bright",
    min: 0.2,
    max: 2,
    step: 0.05,
    group: "BAKE",
  },
];

// Slider panel for the terminal ring backdrop card and its bake camera.
export function RingBackdropDebug() {
  if (!RING_BACKDROP_DEBUG) return null;

  const currentT = useMissionStore((s) => s.currentT);
  const state = useRingBackdropStore();
  const inTerminal = TERMINAL_IDS.has(getActiveTableau(currentT).id);
  if (!inTerminal) return null;

  const set = state.set;

  const readout = [
    `ringSource: ${state.ringSource}`,
    `distance: ${state.distance}`,
    `offsetRight: ${state.offsetRight}`,
    `offsetUp: ${state.offsetUp}`,
    `rollDeg: ${state.rollDeg}`,
    `scaleX: ${state.scaleX}`,
    `scaleY: ${state.scaleY}`,
    `topTaper: ${state.topTaper}`,
    `bottomTaper: ${state.bottomTaper}`,
    `curvature: ${state.curvature}`,
    `opacity: ${state.opacity}`,
    `horizonClip: ${state.horizonClip}`,
    `innerFadeStart: ${state.innerFadeStart}`,
    `innerFadeEnd: ${state.innerFadeEnd}`,
    `bakeElev: ${state.bakeElev}`,
    `bakeReach: ${state.bakeReach}`,
    `bakeFov: ${state.bakeFov}`,
    `bakeBrightness: ${state.bakeBrightness}`,
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
        border: "1px solid rgba(120,200,255,0.35)",
        borderRadius: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        color: "#bfe6ff",
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
        RING BACKDROP
      </div>

      {/* Bake source: procedural finale shader vs earlier-tableau texture. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {(["textured", "procedural"] as const).map((src) => {
          const active = state.ringSource === src;
          return (
            <button
              key={src}
              type="button"
              onClick={() => set({ ringSource: src })}
              style={{
                flex: 1,
                padding: "4px 0",
                fontSize: 11,
                fontFamily: "inherit",
                cursor: "pointer",
                borderRadius: 4,
                border: active
                  ? "1px solid #5cc8ff"
                  : "1px solid rgba(120,200,255,0.25)",
                background: active
                  ? "rgba(92,200,255,0.25)"
                  : "rgba(0,0,0,0.3)",
                color: active ? "#dff3ff" : "#7fb8d8",
              }}
            >
              {src}
            </button>
          );
        })}
      </div>

      {(["CARD", "BAKE"] as const).map((grp) => (
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
                    } as Partial<RingBackdropState>)
                  }
                  style={{ flex: 1, accentColor: "#5cc8ff" }}
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
          height: 92,
          marginTop: 6,
          background: "rgba(0,0,0,0.45)",
          color: "#9fd8ff",
          border: "1px solid rgba(120,200,255,0.2)",
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
