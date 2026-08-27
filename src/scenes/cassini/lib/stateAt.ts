// src/scenes/cassini/lib/stateAt.ts

import * as THREE from "three";
import {
  DISINTEGRATION_T_START,
  HUYGENS_SEPARATION_T,
} from "../data/missionConstants";
import { ORIENTATION_KEYS } from "../data/orientationKeys";
import { RING_CROSSING_T_VALUES } from "../data/phases";
import {
  easeOutBackSoft,
  easeOutCubic,
  norm,
  plateau,
  smoothStep,
  triangle,
} from "./easing";
import { getCartesianState } from "./orbitalMechanics";
import type {
  MissionEffects,
  MissionState,
  StageState,
} from "./types";

function defaultStage(): StageState {
  return {
    visible: true,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    scale: 1,
    opacity: 1,
  };
}

const Q_KEYS = ORIENTATION_KEYS.map((k) => {
  const e = new THREE.Euler(k.euler[0], k.euler[1], k.euler[2], "YXZ");
  return { t: k.t, q: new THREE.Quaternion().setFromEuler(e) };
});

// Reused across calls; the returned Euler is always a fresh allocation.
const _qScratch = new THREE.Quaternion();

function orientationAt(t: number): THREE.Euler {
  // Q_KEYS is non-empty (asserted at module init by ORIENTATION_KEYS), so
  // first/last are always defined under noUncheckedIndexedAccess.
  let lo = Q_KEYS[0]!;
  let hi = Q_KEYS[Q_KEYS.length - 1]!;
  for (let i = 0; i < Q_KEYS.length - 1; i++) {
    const a = Q_KEYS[i]!;
    const b = Q_KEYS[i + 1]!;
    if (t >= a.t && t <= b.t) {
      lo = a;
      hi = b;
      break;
    }
  }
  const frac = lo.t === hi.t ? 0 : (t - lo.t) / (hi.t - lo.t);
  const easedFrac = easeOutBackSoft(Math.max(0, Math.min(1, frac)));

  _qScratch.slerpQuaternions(lo.q, hi.q, easedFrac);
  return new THREE.Euler().setFromQuaternion(_qScratch, "YXZ");
}

export function stateAt(t: number): MissionState {
  const cassini = defaultStage();
  const huygens = defaultStage();
  const mli = defaultStage();
  const effects: MissionEffects = {
    rtgGlow: 0,
    thrusterBurst: 0,
    soiBurn: 0,
    huygensRelease: 0,
    huygensSignal: 1,
    disintegration: 0,
    atmosphericEntry: 0,
    ringCrossing: 0,
    propellant: 1.0,
  };

  effects.rtgGlow = 8.8 - t * 2.8;

  effects.soiBurn = plateau(t, 0.33, 0.34, 0.005);
  if (effects.soiBurn > 0) {
    effects.thrusterBurst = effects.soiBurn * 0.4;
  }

  // Realistic propellant: slow continuous drain during science + major burns
  // SOI (t~0.336): large burn, drops to ~0.68
  // Orbital maneuvers: slow drain through mission
  // Grand Finale (t~0.98): nearly depleted
  if (t <= 0.33) {
    effects.propellant = 1.0 - t * 0.0455; // slow cruise drain
  } else if (t <= 0.34) {
    const soiP = norm(t, 0.33, 0.34);
    effects.propellant = 0.985 - soiP * 0.30; // SOI burn: big drop
  } else if (t <= 0.98) {
    // Science orbits: slow continuous drain with slight acceleration near end
    const sciP = norm(t, 0.34, 0.98);
    effects.propellant = 0.685 - sciP * 0.55 - sciP * sciP * 0.08;
  } else {
    // Grand Finale: last reserves
    effects.propellant = Math.max(0, 0.055 - norm(t, 0.98, 1.0) * 0.055);
  }

  // Trigger times come from the same list phases.ts uses for the ring
  // crossing tableaus, so the flash always lines up with the label.
  effects.ringCrossing = 0;
  for (const ct of RING_CROSSING_T_VALUES) {
    effects.ringCrossing = Math.max(
      effects.ringCrossing,
      triangle(t, ct - 0.0005, ct, ct + 0.0005),
    );
  }

  const sepStart = HUYGENS_SEPARATION_T;
  const entryStart = 0.363966;

  if (t > sepStart) {
    mli.visible = t < sepStart + 0.002;

    const sepProgress = norm(t, sepStart, entryStart);
    const initialElements = {
      a: 18,
      e: 0.7,
      i: 0.15,
      omega: 0.5,
      Omega: 1.0,
      M: 0,
    };
    const currentElements = {
      ...initialElements,
      M: sepProgress * Math.PI * 0.9,
    };

    const p0 = getCartesianState(initialElements);
    const pt = getCartesianState(currentElements);

    huygens.offsetX = pt.x - p0.x;
    huygens.offsetY = pt.y - p0.y;
    huygens.offsetZ = pt.z - p0.z;

    effects.huygensRelease = triangle(
      t,
      sepStart,
      sepStart + 0.0005,
      sepStart + 0.002,
    );

    if (t >= entryStart - 0.005) {
      const descentProgress = norm(t, entryStart - 0.005, entryStart + 0.005);
      effects.huygensSignal = 1.0 - easeOutCubic(descentProgress) * 0.95;
    }

    if (t > entryStart + 0.005) {
      huygens.visible = false;
      huygens.opacity = Math.max(
        0,
        1 - norm(t, entryStart + 0.005, entryStart + 0.01) * 1,
      );
      effects.huygensSignal = 0;
    }
  }

  // Heating starts well after the ring dive begins, so Cassini stays cool
  // through all the crossings and only glows nearing the atmosphere.
  const HEAT_ONSET_T = 0.9974;
  const DISINTEGRATION_START = DISINTEGRATION_T_START;
  if (t > HEAT_ONSET_T) {
    let burnProgress: number;
    if (t < DISINTEGRATION_START) {
      const f = norm(t, HEAT_ONSET_T, DISINTEGRATION_START);
      burnProgress = f * f * 0.3;
    } else {
      burnProgress = 0.3 + norm(t, DISINTEGRATION_START, 1.0) * 0.7;
    }
    effects.disintegration = burnProgress * burnProgress;
    effects.atmosphericEntry = smoothStep(burnProgress);

    cassini.scale = 1.0 - burnProgress * 0.3;
    cassini.opacity = 1.0 - burnProgress;

    mli.scale = 1.0 - burnProgress * 0.8;
    mli.opacity = Math.max(0, 1 - burnProgress * 2);
    mli.visible = mli.opacity > 0.01;
  }

  const orientation = orientationAt(t);

  const cameraRadius = (() => {
    if (t < 0.336) return 80;
    if (t < 0.361) return 60;
    if (t < 0.37) return 40;
    if (t > 0.999) return 30;
    if (t > 0.98) return 50;
    return 70;
  })();

  return {
    cassini,
    huygens,
    mliThermalBlanket: mli,
    effects,
    orientation,
    cameraRadius,
  };
}
