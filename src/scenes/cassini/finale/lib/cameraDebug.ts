// src/scenes/cassini/finale/lib/cameraDebug.ts
//
// Pose for the terminal hero camera. The pose is uniform across the whole
// terminal phase, so the camera never moves between shots and Cassini does all
// the travelling.

import { create } from "zustand";

export const CAMERA_DEBUG = false;

// The viewer may only pan posX, tilt pitch, and resize Cassini. Everything else
// stays frozen, and these clamp the three that move.
export const POSX_MIN = -150;
export const POSX_MAX = 90;
export const PITCH_MIN = -45;
export const PITCH_MAX = 45;
export const CASS_SCALE_MIN = 0.4;
export const CASS_SCALE_MAX = 4.0;

export interface CameraDebugState {
  posX: number;
  posY: number;
  posZ: number;
  pitchDeg: number; // 0 is level, negative looks down
  yawDeg: number; // 0 is downrange, along +X
  fov: number;
  // The pinch gesture resizes the craft, since the camera cannot dolly.
  cassiniScale: number;
  set: (patch: Partial<CameraDebugState>) => void;
}

export const useCameraDebugStore = create<CameraDebugState>((set) => ({
  posX: -30,
  posY: 12,
  posZ: 205,
  pitchDeg: 0,
  yawDeg: 0,
  fov: 60,
  cassiniScale: 1,
  set: (patch) => set(patch),
}));
