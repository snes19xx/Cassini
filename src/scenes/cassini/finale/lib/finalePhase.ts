// Derived HUD state for the finale, all pure functions of t.

import {
  getFinaleSubphase,
  getFinaleSubphaseProgress,
  isFinalPlungeOrLater,
  SUBPHASE_THRESHOLDS,
} from "../data/subphases";
import { DIVES, nextDive } from "../data/diveTable";

export type DownlinkState = "active" | "transmit" | "degraded" | "lost";

export function getDownlinkState(t: number): DownlinkState {
  const ph = getFinaleSubphase(t);
  if (ph === "los") return "lost";
  if (ph === "plasma" || ph === "plunge") return "degraded";
  if (ph === "dives" || ph === "final5") {
    for (const d of DIVES) {
      if (Math.abs(t - d.t) < 0.0005) return "transmit";
    }
  }
  return "active";
}

export function downlinkLabel(s: DownlinkState): string {
  switch (s) {
    case "active":   return "DOWNLINK ACTIVE";
    case "transmit": return "TRANSMITTING";
    case "degraded": return "SIGNAL DEGRADED";
    case "lost":     return "SIGNAL LOST";
  }
}

// Cinematic altitude above Saturn's 1-bar level, in km.
export function getAltitudeKm(t: number): number {
  const ph = getFinaleSubphase(t);
  if (ph === "pre") {
    return 270000 + Math.sin(t * 800) * 8000;
  }
  if (ph === "dives") {
    const p = getFinaleSubphaseProgress(t);
    const cycle = Math.cos(p * Math.PI * 17 * 2);
    return 65000 + cycle * 60000;
  }
  if (ph === "final5") {
    const p = getFinaleSubphaseProgress(t);
    const cycle = Math.cos(p * Math.PI * 5 * 2);
    return 22000 - p * 17000 + cycle * 3000;
  }
  if (ph === "plunge") {
    const p = getFinaleSubphaseProgress(t);
    return 1500 * (1 - p);
  }
  return 0;
}

// Bus skin temperature in Kelvin (~120 K cruise -> ~1500 K at LOS).
export function getSkinTemperatureK(t: number): number {
  const ph = getFinaleSubphase(t);
  if (ph === "pre" || ph === "dives") return 120;
  if (ph === "final5") {
    const p = getFinaleSubphaseProgress(t);
    return 120 + p * 80;
  }
  if (ph === "plunge") {
    const p = getFinaleSubphaseProgress(t);
    return 200 + p * 1200;
  }
  return 1500;
}

// Structural integrity 0..1, cascading to 0 through plunge via smoothstep.
export function getStructuralIntegrity(t: number): number {
  const ph = getFinaleSubphase(t);
  if (ph === "los") return 0;
  if (!isFinalPlungeOrLater(t)) return 1;
  const p = ph === "plunge"
    ? getFinaleSubphaseProgress(t) * 0.7
    : 0.7 + getFinaleSubphaseProgress(t) * 0.3;
  return Math.max(0, 1 - p * p * (3 - 2 * p));
}

// Seconds until the next periapse/dive, or null outside the dive window.
export function timeToNextDiveSec(t: number): number | null {
  const ph = getFinaleSubphase(t);
  if (ph === "los" || ph === "plasma" || ph === "plunge") return null;
  const upcoming = nextDive(t);
  if (!upcoming) return null;
  const MISSION_SPAN_SEC = (new Date("2017-09-15").getTime() - new Date("1997-10-15").getTime()) / 1000;
  return (upcoming.t - t) * MISSION_SPAN_SEC;
}

export function formatCountdown(sec: number | null): string {
  if (sec === null) return "—";
  const s = Math.abs(sec);
  if (s > 86400) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `T-${d}d ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  return `T-${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

// Cassini hit ~34.2 km/s at atmospheric entry.
export function getFinaleVelocityKms(t: number): number {
  const ph = getFinaleSubphase(t);
  if (ph === "pre")    return 8 + (t - SUBPHASE_THRESHOLDS.pre) * 100;
  if (ph === "dives")  return 17 + getFinaleSubphaseProgress(t) * 6;
  if (ph === "final5") return 22 + getFinaleSubphaseProgress(t) * 6;
  if (ph === "plunge") return 28 + getFinaleSubphaseProgress(t) * 7;
  return 34.5;
}
