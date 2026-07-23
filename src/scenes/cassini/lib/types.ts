import * as THREE from 'three'

export interface StageState {
  visible: boolean
  offsetX: number    // World-space translation delta, metres (scene units)
  offsetY: number
  offsetZ: number
  scale: number      // Uniform scale [0, 1]; drives disintegration envelope
  opacity: number    // [0, 1]; drives material alpha and label visibility
}

export interface MissionEffects {
  rtgGlow: number         // RTG thermal emission intensity [0, 1]
  thrusterBurst: number   // RCS attitude-control burst intensity [0, 1]
  soiBurn: number         // Saturn Orbit Insertion main engine [0, 1]
  huygensRelease: number  // Separation spring/pyro impulse [0, 1]
  huygensSignal: number   // Telemetry link quality [1=clear -> 0=lost]
  disintegration: number  // Grand Finale erosion envelope [0, 1]
  atmosphericEntry: number // Saturn atmospheric friction glow [0, 1]
  ringCrossing: number    // Ring-plane crossing dust hazard [0, 1]
  propellant: number      // Remaining propellant [0, 1]
}

export interface MissionState {
  cassini: StageState
  huygens: StageState
  mliThermalBlanket: StageState  // Multi-Layer Insulation, visible pre-separation
  effects: MissionEffects
  orientation: THREE.Euler        // Global spacecraft Euler angles
  cameraRadius: number            // Target distance for cinematic framing
}
