// Shared mission-timeline constants used by tableaus, phases, and the store.
// Keep this free of imports from those modules to avoid cycles.

// Start of the committed terminal plunge: plungeTrajectory owns Cassini's
// position from here, and the descent script keys off it.
export const TERMINAL_T_START = 0.994677;

// Start of visible break-up, and the last ring-plane crossing of the Final Five.
export const DISINTEGRATION_T_START = 0.999115;
