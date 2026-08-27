/** Standard cubic ease-out. Decelerates from fast to stopped. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Sub-critical ease-out-back. c1=0.8 produces minimal overshoot,
 * simulating a heavy mechanical gimbal reaching its stop.
 */
export function easeOutBackSoft(t: number): number {
  const c1 = 0.8
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Smooth step from 0 to 1 with zero first-derivative at endpoints. */
export function smoothStep(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * Triangle envelope: rises linearly from `start` to `peak`,
 * then falls linearly to `end`.
 */
export function triangle(t: number, start: number, peak: number, end: number): number {
  if (t <= start || t >= end) return 0
  if (t < peak) return (t - start) / (peak - start)
  return (end - t) / (end - peak)
}

/**
 * Plateau envelope: ramps up, holds at 1.0, ramps down.
 */
export function plateau(t: number, start: number, end: number, ramp: number): number {
  if (t <= start || t >= end) return 0
  if (t < start + ramp) return (t - start) / ramp
  if (t > end - ramp) return (end - t) / ramp
  return 1
}

/** Normalize t within [start, end] and clamp to [0, 1]. */
export function norm(t: number, start: number, end: number): number {
  return Math.max(0, Math.min(1, (t - start) / (end - start)))
}
