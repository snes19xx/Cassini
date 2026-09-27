import * as THREE from "three";
import { ORIENTATION_KEYS } from "../data/orientationKeys";
import { easeOutBackSoft } from "./easing";

const Q_KEYS = ORIENTATION_KEYS.map((k) => {
  const e = new THREE.Euler(k.euler[0], k.euler[1], k.euler[2], "YXZ");
  return { t: k.t, q: new THREE.Quaternion().setFromEuler(e) };
});

const _qScratch = new THREE.Quaternion();

/** Spacecraft attitude at mission t, as a fresh Euler. */
export function orientationAt(t: number): THREE.Euler {
  // ORIENTATION_KEYS is never empty
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
