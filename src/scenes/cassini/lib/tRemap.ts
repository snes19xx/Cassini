// Piecewise-linear bijection between missionT (raw 0-1 timeline) and
// displayT (0-1 scrubber position). Cruise is compressed hard; encounters
// and the Grand Finale each get a deliberate wall-clock slice.
//
// REMAP_POINTS pairs [missionT, displayT]. There is an anchor on every late
// tableau boundary so each scene's duration is stated outright instead of
// falling out of the interpolation.
//
// Wall-clock budget at 1x, seconds per segment:
//   FAMILY PORTRAIT      0.810    -> 0.870     31.0
//   THREE CRESCENTS      0.870    -> 0.945     13.0
//   FINAL APPROACH       0.945    -> 0.955      9.0
//   POLAR PASSAGE        0.955    -> 0.961      7.0
//   INTO THE RINGS       0.961    -> 0.963      7.4
//   SWING AROUND         0.963    -> 0.978     24.0
//   RING DIVE            0.978    -> 0.994677  42.0
//   SATURN'S ATMOSPHERE  0.994677 -> 0.999115  23.7
//   END OF MISSION       0.999115 -> 1.0        7.3
// The terminal durations are held to the decimal so the finale shot
// schedule lands on the same T+ seconds.

import {
  DISINTEGRATION_T_START,
  TERMINAL_T_START,
} from "../data/missionConstants";

const REMAP_POINTS: [number, number][] = [
  [0.000000, 0.000000],  // Launch
  [0.180000, 0.014218],  // Cruise/arrival boundary, pins cruise at 4.3s
  [0.253196, 0.036839],  // Camera Test (Oct 2002)
  [0.336770, 0.062667],  // Saturn Orbit Insertion
  [0.352000, 0.074667],  // Pre titan_huygens
  [0.364000, 0.098666],  // titan_huygens peak, Huygens descent
  [0.380000, 0.118666],  // Post titan_huygens
  [0.389000, 0.130666],  // enceladus_first
  [0.421000, 0.150666],  // enceladus_liquid_water
  [0.440000, 0.170666],  // titan_lakes
  [0.447560, 0.182666],  // seeing_new_rings
  [0.497000, 0.206667],  // iapetus_close
  [0.501000, 0.217818],  // enceladus_tiger
  [0.522000, 0.231757],  // enceladus_organic
  [0.551000, 0.248485],  // enceladus_closest
  [0.593402, 0.268000],  // equinox
  [0.619000, 0.288000],  // mimas_close
  [0.637000, 0.308000],  // titan_close
  [0.659000, 0.328000],  // rhea_exosphere
  [0.687000, 0.352000],  // enceladus_ocean
  [0.699000, 0.376000],  // moon trio release
  [0.722000, 0.396000],  // dione_air
  [0.739519, 0.412000],  // more_rings
  [0.791065, 0.436000],  // wave_at_saturn
  [0.810000, 0.452000],  // FAMILY PORTRAIT start
  [0.870000, 0.555367],  // THREE CRESCENTS start
  [0.945000, 0.598700],  // FINAL APPROACH start
  [0.955000, 0.628700],  // POLAR PASSAGE start
  [0.961000, 0.652000],  // INTO THE RINGS start
  [0.963000, 0.676700],  // SWING AROUND start
  [0.978000, 0.756700],  // RING DIVE start
  [TERMINAL_T_START, 0.896700],       // SATURN'S ATMOSPHERE start
  [DISINTEGRATION_T_START, 0.975700], // END OF MISSION start
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
