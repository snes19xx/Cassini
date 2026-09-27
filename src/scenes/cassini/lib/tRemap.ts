// Piecewise-linear bijection between missionT (raw 0-1 timeline) and
// displayT (0-1 scrubber position). REMAP_POINTS pairs [missionT, displayT],
// with an anchor on every late tableau boundary.

// Wall-clock budget at 1x, seconds per segment:
//   CRUISE               0.0      -> 0.180      4.3
//   SATURN ORBIT INS.    0.180    -> 0.353     35.7   (30.7 approach + 5.0 fling)
//   FAMILY PORTRAIT      0.810    -> 0.870     12.4
//   THREE CRESCENTS      0.870    -> 0.945     13.0
//   SWING AROUND         0.945    -> 0.978     31.0
//   RING DIVE            0.978    -> 0.994677  60.0
//   SATURN'S ATMOSPHERE  0.994677 -> 0.999115  23.7
//   END OF MISSION       0.999115 -> 1.0        7.3

// Terminal durations are held to the decimal so the finale shot schedule
// lands on the same T+ seconds.

import {
  DISINTEGRATION_T_START,
  TERMINAL_T_START,
} from "../data/missionConstants";

export const REMAP_POINTS: [number, number][] = [
  [0.000000, 0.000000],
  [0.180000, 0.014218],  // Cruise/arrival boundary, 4.3s cruise
  [0.253196, 0.057368],  // Camera Test (Oct 2002)
  [0.336770, 0.106633],  // Saturn Orbit Insertion
  [0.352000, 0.129523],
  [0.353000, 0.133337],  // Arrival/titan_huygens boundary
  [0.364000, 0.155338],
  [0.380000, 0.175340],
  [0.389000, 0.187339],
  [0.421000, 0.207339],
  [0.440000, 0.227340],
  [0.447560, 0.239340],
  [0.497000, 0.263342],
  [0.501000, 0.274494],
  [0.522000, 0.288433],
  [0.551000, 0.305161],
  [0.593402, 0.324677],
  [0.619000, 0.344678],
  [0.637000, 0.364679],
  [0.659000, 0.384679],
  [0.687000, 0.408680],
  [0.699000, 0.432682],
  [0.722000, 0.452682],
  [0.739519, 0.468681],
  [0.791065, 0.492684],
  [0.810000, 0.508683],  // FAMILY PORTRAIT start
  [0.870000, 0.550051],  // THREE CRESCENTS start
  [0.945000, 0.593386],  // SWING AROUND start
  [0.978000, 0.696689],  // RING DIVE start
  [TERMINAL_T_START, 0.896696],       // SATURN'S ATMOSPHERE start
  [DISINTEGRATION_T_START, 0.975699], // END OF MISSION start
  [1.000000, 1.000000],  // Signal lost / impact
];

export function missionToDisplay(mt: number): number {
  mt = Math.max(0, Math.min(1, mt));
  for (let i = 1; i < REMAP_POINTS.length; i++) {
    const pt0 = REMAP_POINTS[i - 1];
    const pt1 = REMAP_POINTS[i];
    if (!pt0 || !pt1) continue;
    const [m0, d0] = pt0;
    const [m1, d1] = pt1;
    if (mt <= m1) {
      const frac = m1 === m0 ? 0 : (mt - m0) / (m1 - m0);
      return d0 + frac * (d1 - d0);
    }
  }
  return 1;
}

export function displayToMission(dt: number): number {
  dt = Math.max(0, Math.min(1, dt));
  for (let i = 1; i < REMAP_POINTS.length; i++) {
    const pt0 = REMAP_POINTS[i - 1];
    const pt1 = REMAP_POINTS[i];
    if (!pt0 || !pt1) continue;
    const [m0, d0] = pt0;
    const [m1, d1] = pt1;
    if (dt <= d1) {
      const frac = d1 === d0 ? 0 : (dt - d0) / (d1 - d0);
      return m0 + frac * (m1 - m0);
    }
  }
  return 1;
}
