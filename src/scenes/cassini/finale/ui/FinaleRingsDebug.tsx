import { TERMINAL_TABLEAU_IDS as TERMINAL_IDS } from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import {
  FINALE_RINGS_DEBUG,
  useFinaleRingsStore,
  type FinaleRingsState,
} from "../lib/finaleRingsDebug";

interface Row {
  key: keyof FinaleRingsState;
  label: string;
  min: number;
  max: number;
  step: number;
  group: "RING" | "LAYER" | "PARTICLES";
  commitBake?: boolean; // rebuilds noise on release
}

const ROWS: Row[] = [
  { key: "ringR", label: "color R", min: 0, max: 1, step: 0.01, group: "RING" },
  { key: "ringG", label: "color G", min: 0, max: 1, step: 0.01, group: "RING" },
  { key: "ringB", label: "color B", min: 0, max: 1, step: 0.01, group: "RING" },
  {
    key: "ringOpacity",
    label: "opacity",
    min: 0,
    max: 2,
    step: 0.01,
    group: "RING",
  },
  {
    key: "swirlBase",
    label: "swirl base",
    min: 0,
    max: 1.5,
    step: 0.01,
    group: "RING",
  },
  {
    key: "swirlAmount",
    label: "swirl amt",
    min: 0,
    max: 1.5,
    step: 0.01,
    group: "RING",
  },
  {
    key: "swirlBakeTime",
    label: "swirl time",
    min: 0,
    max: 60,
    step: 0.5,
    group: "RING",
    commitBake: true,
  },
  {
    key: "texOpacity",
    label: "tex layer",
    min: 0,
    max: 1,
    step: 0.01,
    group: "LAYER",
  },
  {
    key: "partCount",
    label: "count",
    min: 0,
    max: 80000,
    step: 500,
    group: "PARTICLES",
  },
  {
    key: "partSize",
    label: "size",
    min: 0.05,
    max: 3,
    step: 0.01,
    group: "PARTICLES",
  },
  {
    key: "partJitter",
    label: "jitter",
    min: 0,
    max: 3,
    step: 0.05,
    group: "PARTICLES",
  },
  {
    key: "partOpacity",
    label: "opacity",
    min: 0,
    max: 2,
    step: 0.01,
    group: "PARTICLES",
  },
  {
    key: "partR",
    label: "color R",
    min: 0,
    max: 1,
    step: 0.01,
    group: "PARTICLES",
  },
  {
    key: "partG",
    label: "color G",
    min: 0,
    max: 1,
    step: 0.01,
    group: "PARTICLES",
  },
  {
    key: "partB",
    label: "color B",
    min: 0,
    max: 1,
    step: 0.01,
    group: "PARTICLES",
  },
  {
    key: "partBrightness",
    label: "bright",
    min: 0,
    max: 3,
    step: 0.05,
    group: "PARTICLES",
  },
];

// Slider panel for the finale rings disk and particle field.
export function FinaleRingsDebug() {
  if (!FINALE_RINGS_DEBUG) return null;

  // Tracks tableau identity so this only rerenders on tableau change.
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);
  const tableauKind = useMissionStore((s) => getActiveTableau(s.currentT).kind);
  const renderMode = useMissionStore((s) => s.renderMode);
  const state = useFinaleRingsStore();

  const isPhotoreal = renderMode === "space" || renderMode === "editorial";
  const inLiveFinale =
    tableauKind === "finale" && !TERMINAL_IDS.has(tableauId) && isPhotoreal;
  if (!inLiveFinale) return null;

  const set = state.set;

  const readout = ROWS.map((r) => {
    const v = state[r.key] as number;
    return `${r.key}: ${Number.isInteger(v) ? v : v.toFixed(2)}`;
  }).join("\n");

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 10000,
        width: 270,
        padding: "12px 14px",
        // Solid background keeps sliders readable over the bright finale.
        background: "#0a0e14",
        border: "1px solid rgba(255,210,150,0.45)",
        borderRadius: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        color: "#ffe6c8",
        fontSize: 12,
        userSelect: "none",
        boxShadow: "0 6px 24px rgba(0,0,0,0.7)",
        maxHeight: "92vh",
        overflowY: "auto",
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
        FINALE RINGS
      </div>

      {(["RING", "LAYER", "PARTICLES"] as const).map((grp) => (
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
                <label style={{ width: 70, fontSize: 11 }}>{r.label}</label>
                <input
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  value={val}
                  onChange={(e) =>
                    set({
                      [r.key]: parseFloat(e.target.value),
                    } as Partial<FinaleRingsState>)
                  }
                  onPointerUp={
                    r.commitBake ? () => state.commitBake() : undefined
                  }
                  style={{ flex: 1, accentColor: "#ffb259" }}
                />
                <span style={{ width: 48, textAlign: "right", fontSize: 11 }}>
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
          marginTop: 6,
          background: "rgba(0,0,0,0.45)",
          color: "#ffd9a8",
          border: "1px solid rgba(255,210,150,0.2)",
          borderRadius: 4,
          fontFamily: "inherit",
          fontSize: 10.5,
          resize: "none",
        }}
      />
      <div style={{ opacity: 0.5, fontSize: 9.5, marginTop: 4 }}>
        swirl time rebuilds on release · click box → copy → paste to Claude
      </div>
    </div>
  );
}
