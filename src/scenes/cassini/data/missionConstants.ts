// Shared mission-timeline constants used by tableaus, phases, and the store.
// Keep this free of imports from those modules to avoid cycles.

// Start of the committed terminal plunge: plungeTrajectory owns Cassini's
// position from here, and the descent script keys off it.
export const TERMINAL_T_START = 0.994677;

// Start of visible break-up, and the last ring-plane crossing of the Final Five.
export const DISINTEGRATION_T_START = 0.999115;

// Furthest t any seek control may land on. Break-up and the end card
// past this point are reachable only by playing through.
export const SEEK_MAX_T = DISINTEGRATION_T_START;

// Clamp a user-driven seek to the scrubbable range.
export function clampSeekT(t: number): number {
  return Math.min(t, SEEK_MAX_T);
}

export const ATMOSPHERE_TABLEAU_ID = "finale_atmospheric";

// The two terminal tableaus: sphere-Saturn hidden, SkyDome/RingBackdrop/
// CassiniTrail on the terminal stage, camera on the locked descent script.
export const TERMINAL_TABLEAU_IDS: ReadonlySet<string> = new Set([
  ATMOSPHERE_TABLEAU_ID,
  "finale_disintegration",
]);

export function isTerminalTableau(id: string): boolean {
  return TERMINAL_TABLEAU_IDS.has(id);
}

// The two Kepler-orbit finale tableaus, driven per-frame by RingDiveCameraDriver.
export const ORBITAL_TABLEAU_IDS: ReadonlySet<string> = new Set([
  "finale_swing_around",
  "finale_ring_dive",
]);

export function isOrbitalTableau(id: string): boolean {
  return ORBITAL_TABLEAU_IDS.has(id);
}

// Wall-clock seconds for the full mission at 1x playback (displayT 0 to 1).
// MissionTimeAdvancer divides by this.
export const FULL_MISSION_SECONDS = 281.4;

// Huygens probe separation, Dec 25 2004. Spacecraft model swap, probe stage
// animation, and label anchors key off this t.
export const HUYGENS_SEPARATION_T = 0.361177;
