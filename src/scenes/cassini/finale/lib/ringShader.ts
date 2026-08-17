// Shared ring-shader assets for VolumetricRings (live 3D annulus) and RingBackdrop (baked billboard).

import * as THREE from "three";

export const RING_INNER = 200.0;
export const RING_OUTER = 419.3;
export const RADIAL_SEGMENTS = 256;
export const PHI_SEGMENTS = 8;
export const SATURN_RADIUS = 180;
export const PROFILE_LEN = 1024;

export const RING_AXIAL_TILT_DEG = 26.73;

export const NOISE_TEX_THETA = 1024;
export const NOISE_TEX_R = 512;
export const RING_SWIRL_BAKE_TIME = 12.0;

function jsFract(x: number): number {
  return x - Math.floor(x);
}
function jsMod(x: number, y: number): number {
  return x - y * Math.floor(x / y);
}
function jsHash21(px: number, py: number): number {
  let ax = jsFract(px * 123.34);
  let ay = jsFract(py * 456.21);
  const d = ax * (ax + 45.32) + ay * (ay + 45.32);
  ax += d;
  ay += d;
  return jsFract(ax * ay);
}
function jsPolarValueNoise(
  r: number,
  theta: number,
  radialFreq: number,
  angularFreq: number,
): number {
  const rs = r * radialFreq;
  const ts = ((theta + Math.PI) / (2 * Math.PI)) * angularFreq;
  const r0 = Math.floor(rs);
  const r1 = r0 + 1;
  const t0 = Math.floor(ts);
  const t1 = t0 + 1;
  const t0w = jsMod(t0, angularFreq);
  const t1w = jsMod(t1, angularFreq);
  const h00 = jsHash21(r0, t0w);
  const h10 = jsHash21(r1, t0w);
  const h01 = jsHash21(r0, t1w);
  const h11 = jsHash21(r1, t1w);
  let fx = jsFract(rs);
  let fy = jsFract(ts);
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = h00 + (h10 - h00) * fx;
  const b = h01 + (h11 - h01) * fx;
  return a + (b - a) * fy;
}

// Pre-bake the polar swirl noise into a texture instead of computing per-fragment.
export function buildRingNoiseTexture(
  bakeTime: number = RING_SWIRL_BAKE_TIME,
): THREE.DataTexture {
  const W = NOISE_TEX_THETA;
  const H = NOISE_TEX_R;
  const data = new Uint8Array(W * H * 4);
  const TWO_PI = Math.PI * 2;
  for (let yi = 0; yi < H; yi++) {
    const vR = yi / (H - 1);
    const wDenom = Math.pow(vR + 0.6, 1.5);
    const omega1 = (0.09 / wDenom) * bakeTime;
    const omega2 = (0.18 / wDenom) * bakeTime;
    const omega3 = (0.35 / wDenom) * bakeTime;
    for (let xi = 0; xi < W; xi++) {
      const theta = (xi / W) * TWO_PI - Math.PI;
      const n1 = jsPolarValueNoise(vR, theta + omega1, 22.0, 48.0);
      const n2 = jsPolarValueNoise(vR, theta + omega2, 56.0, 140.0);
      const n3 = jsPolarValueNoise(vR, theta + omega3, 140.0, 300.0);
      const n = n1 * 0.55 + n2 * 0.3 + n3 * 0.15;
      const byte = Math.max(0, Math.min(255, Math.round(n * 255)));
      const idx = (yi * W + xi) * 4;
      data[idx] = byte;
      data[idx + 1] = byte;
      data[idx + 2] = byte;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(
    data,
    W,
    H,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function makeRingDensityProfile(): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(PROFILE_LEN * 4));
  for (let i = 0; i < PROFILE_LEN; i++) {
    const vR = i / (PROFILE_LEN - 1);
    let d: number;

    if (vR < 0.103) {
      const p = vR / 0.103;
      d = 0.22 + p * 0.10;
    } else if (vR < 0.341) {
      const p = (vR - 0.103) / (0.341 - 0.103);
      d = 0.25 + p * 0.25;
    } else if (vR < 0.689) {
      const p = (vR - 0.341) / (0.689 - 0.341);
      d = 0.45 + 0.50 * smoothstep(0.0, 0.18, p) * (1.0 - smoothstep(0.78, 1.0, p));
    } else if (vR < 0.751) {
      const p = (vR - 0.689) / (0.751 - 0.689);
      d = 0.95 * smoothstep(0.0, 0.40, p) + 0.05 + 0.4 * smoothstep(0.60, 1.0, p);
    } else if (vR < 0.951) {
      const p = (vR - 0.751) / (0.951 - 0.751);
      d = 0.55 + 0.20 * (1.0 - p);
      const enckeDist = Math.abs(p - 0.78);
      if (enckeDist < 0.012) {
        d *= enckeDist / 0.012;
      }
      if (p > 0.92) d *= (1.0 - (p - 0.92) / 0.08) * 0.6;
    } else if (vR < 0.985) {
      d = 0.04;
    } else {
      const p = (vR - 0.985) / (1.0 - 0.985);
      const g = Math.exp(-((p - 0.4) * (p - 0.4)) / 0.04);
      d = 0.10 + 0.85 * g;
    }

    const byte = Math.max(0, Math.min(255, Math.round(d * 255)));
    buf[i * 4 + 0] = byte;
    buf[i * 4 + 1] = byte;
    buf[i * 4 + 2] = byte;
    buf[i * 4 + 3] = 255;
  }
  return buf;
}

let cachedNoiseTexture: THREE.DataTexture | null = null;
export function getRingNoiseTexture(): THREE.DataTexture {
  if (!cachedNoiseTexture) cachedNoiseTexture = buildRingNoiseTexture();
  return cachedNoiseTexture;
}
