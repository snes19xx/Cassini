export interface StageState {
  visible: boolean
  offsetX: number    // World-space delta, scene units
  offsetY: number
  offsetZ: number
  scale: number      // Uniform, [0, 1]
  opacity: number    // [0, 1]
}

export interface MissionEffects {
  rtgGlow: number         // RTG glow [0, 1]
  thrusterBurst: number   // RCS burst [0, 1]
  soiBurn: number         // Saturn Orbit Insertion [0, 1]
  huygensRelease: number  // Separation spring/pyro impulse [0, 1]
  huygensSignal: number   // Link quality, 1=clear 0=lost
  disintegration: number  // Finale erosion [0, 1]
  atmosphericEntry: number // Entry friction glow [0, 1]
  ringCrossing: number    // Ring-plane dust hazard [0, 1]
  propellant: number      // Remaining propellant [0, 1]
}

export interface MissionState {
  cassini: StageState
  huygens: StageState
  mliThermalBlanket: StageState  // Multi-Layer Insulation, visible pre-separation
  effects: MissionEffects
  cameraRadius: number            // Target distance for cinematic framing
}
