import {
  FULL_MISSION_SECONDS,
  TERMINAL_T_START,
  TERMINAL_TABLEAU_IDS,
} from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import { missionToDisplay } from "../../lib/tRemap";

const DEBUG_HUD_ENABLED = import.meta.env.DEV && false;
const SHOW_EVERYWHERE = false;

const ATMOSPHERE_T_START = TERMINAL_T_START;
const TERMINAL_T_END = 1.0001;
const DISPLAY_AT_START = missionToDisplay(ATMOSPHERE_T_START);

const TERMINAL_IDS = TERMINAL_TABLEAU_IDS;

function fmtClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}:${rem.toFixed(1).padStart(4, "0")}`;
}

// On-screen clock and phase readout for the terminal finale window.
export function FinaleDebugHUD() {
  if (!DEBUG_HUD_ENABLED) return null;

  const currentT = useMissionStore((s) => s.currentT);
  const tableau = getActiveTableau(currentT);

  const inTerminal = TERMINAL_IDS.has(tableau.id);
  if (!SHOW_EVERYWHERE && !inTerminal) return null;

  // Through the display remap so it stays in sync with the scrubber.
  const displayNow = missionToDisplay(currentT);
  const elapsedSec = Math.max(
    0,
    (displayNow - DISPLAY_AT_START) * FULL_MISSION_SECONDS,
  );
  const absoluteSec = displayNow * FULL_MISSION_SECONDS;

  const pct = Math.max(
    0,
    Math.min(
      100,
      ((currentT - ATMOSPHERE_T_START) /
        (TERMINAL_T_END - ATMOSPHERE_T_START)) *
        100,
    ),
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 116, // clears the top chrome row
        right: 28,
        zIndex: 9999,
        pointerEvents: "none",
        textAlign: "right",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        color: "#ff2a2a",
        textShadow: "0 0 6px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9)",
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 1,
        }}
      >
        {inTerminal ? `T+ ${elapsedSec.toFixed(1)}s` : "DEBUG"}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
        {tableau.label} · {pct.toFixed(0)}%
      </div>
      <div
        style={{ fontSize: 14, fontWeight: 600, marginTop: 2, opacity: 0.9 }}
      >
        t={currentT.toFixed(6)} · clock {fmtClock(absoluteSec)}
      </div>
    </div>
  );
}
