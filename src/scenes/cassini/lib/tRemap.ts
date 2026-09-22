// Piecewise-linear bijection between missionT (raw 0-1 timeline) and
// displayT (0-1 scrubber position). REMAP_POINTS pairs [missionT, displayT],
// with an anchor on every late tableau boundary.

// Wall-clock budget at 1x, seconds per segment:
//   CRUISE               0.0      -> 0.180      4.3
//   SATURN ORBIT INS.    0.180    -> 0.353     35.7   (30.7 approach + 5.0 fling)
//   FAMILY PORTRAIT      0.810    -> 0.870     12.4
//   THREE CRESCENTS      0.870    -> 0.945     13.0
//   FINAL APPROACH       0.945    -> 0.955      9.0
//   POLAR PASSAGE        0.955    -> 0.961      7.0
//   INTO THE RINGS       0.961    -> 0.963      7.4
//   SWING AROUND         0.963    -> 0.978     24.0
//   RING DIVE            0.978    -> 0.994677  42.0
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
  [0.180000, 0.014294],  // Cruise/arrival boundary, 4.3s cruise
  [0.253196, 0.057673],  // Camera Test (Oct 2002)
  [0.336770, 0.107201],  // Saturn Orbit Insertion
  [0.352000, 0.130213],
  [0.353000, 0.134048],  // Arrival/titan_huygens boundary
  [0.364000, 0.156166],
  [0.380000, 0.176274],
  [0.389000, 0.188337],
  [0.421000, 0.208444],
  [0.440000, 0.228552],
  [0.447560, 0.240616],
  [0.497000, 0.264745],
  [0.501000, 0.275956],
  [0.522000, 0.289970],
  [0.551000, 0.306787],
  [0.593402, 0.326407],
  [0.619000, 0.346514],
  [0.637000, 0.366622],
  [0.659000, 0.386729],
  [0.687000, 0.410858],
  [0.699000, 0.434987],
  [0.722000, 0.455094],
  [0.739519, 0.471179],
  [0.791065, 0.495309],
  [0.810000, 0.511394],  // FAMILY PORTRAIT start
  [0.870000, 0.552983],  // THREE CRESCENTS start
  [0.945000, 0.596548],  // FINAL APPROACH start
  [0.955000, 0.626709],  // POLAR PASSAGE start
  [0.961000, 0.650134],  // INTO THE RINGS start
  [0.963000, 0.674966],  // SWING AROUND start
  [0.978000, 0.755395],  // RING DIVE start
  [TERMINAL_T_START, 0.896146],       // SATURN'S ATMOSPHERE start
  [DISINTEGRATION_T_START, 0.975570], // END OF MISSION start
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
