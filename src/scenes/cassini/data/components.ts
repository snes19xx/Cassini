// src/scenes/cassini/data/components.ts

import * as THREE from "three";

export interface StatRow {
  label: string;
  value: string;
}

export interface ComponentMetadata {
  id: string;
  name: string;
  shortName: string;
  description: string;
  mass: number;
  parent: string;
  stats: StatRow[];
  // busRelative false: absolute scene-space position, driven by a live mesh
  // ref. busRelative true: local offset from bus centre, rotated by the
  // spacecraft quaternion (scene units run ~0.5x model metres).
  anchor: THREE.Vector3;
  modelRadius: number;
  busRelative: boolean;
}

export const COMPONENTS: ComponentMetadata[] = [
  // Primary: live mesh refs

  {
    id: "bus",
    name: "Main Spacecraft Bus",
    shortName: "BUS",
    description:
      "12-sided (dodecagonal) aluminum honeycomb structure, 6.7 m tall and 4.0 m wide. " +
      "Houses the propulsion module, command & data subsystem, power conditioning, and " +
      "all attitude-control electronics. Dry mass 2,125 kg; propellant load at launch 3,132 kg.",
    mass: 2125,
    parent: "root",
    stats: [
      { label: "Dry mass", value: "2,125 kg" },
      { label: "Propellant load", value: "3,132 kg" },
      { label: "Fueled mass", value: "5,712 kg" },
      { label: "Height", value: "6.7 m" },
      { label: "Width", value: "4.0 m" },
      { label: "Structure", value: "12-sided Al honeycomb" },
    ],
    anchor: new THREE.Vector3(0, 0, 0),
    modelRadius: 3,
    busRelative: false,
  },

  {
    id: "hga",
    name: "High-Gain Antenna",
    shortName: "HGA",
    description:
      "4.0 m diameter parabolic dish — the primary telecom link to Earth and the " +
      "aperture for the RADAR and RSS science instruments. Operates in X-band (8.4 GHz), " +
      "Ka-band (32 GHz), S-band, and Ku-band. During Grand Finale ring-plane crossings, " +
      "the HGA was pointed forward to shield the spacecraft from ring particles.",
    mass: 105,
    parent: "bus",
    stats: [
      { label: "Diameter", value: "4.0 m" },
      { label: "Mass", value: "105 kg" },
      { label: "X-band gain (down)", value: "46.6 dBi @ 8,425 MHz" },
      { label: "Ka-band gain (down)", value: "56.4 dBi @ 32,028 MHz" },
      { label: "X-band beamwidth", value: "0.635°" },
      { label: "Ka-band beamwidth", value: "0.167°" },
      { label: "Ku-band (RADAR)", value: "49.8 dBi @ 13,776.5 MHz" },
    ],
    anchor: new THREE.Vector3(0.002, 1.932, -0.101),
    modelRadius: 2,
    busRelative: false,
  },

  {
    id: "huygens",
    name: "The Huygens Probe",
    shortName: "HUYGENS",
    description:
      "The Huygens probe, built by the ESA, was part of " +
      "the Cassini-Huygens mission to explore Saturn and its largest moon, Titan. " +
      "It was designed to study Titan's atmosphere and surface composition, making " +
      "it the first spacecraft to land on a body in the outer solar system.",
    mass: 318,
    parent: "bus",
    stats: [
      { label: "Total mass", value: "318 kg" },
      {
        label: "Sensors",
        value: "HASI, GCMS, ACP",
      },
      {
        label: "Imaging",
        value: "DISR, DWE",
      },
      { label: "Surface Science", value: "SSP" },
    ],
    anchor: new THREE.Vector3(0.072, -0.721, -4.587),
    modelRadius: 1.5,
    busRelative: false,
  },

  {
    id: "mag",
    name: "MAG",
    shortName: "MAG",
    description:
      "Dual Technique Magnetometer — fluxgate (FGM) at 6.5 m on the magnetometer boom " +
      "and a vector/scalar helium magnetometer (V/SHM) at 11 m from the spacecraft centre. " +
      "Total boom length: 13.0 m. Mapped Saturn's global magnetic field structure " +
      "and quantified Titan's induced magnetosphere.",
    mass: 8.82,
    parent: "bus",
    stats: [
      { label: "Mass", value: "8.82 kg (total system)" },
      { label: "FGM position", value: "6.5 m on boom" },
      { label: "V/SHM pos", value: "11.0 m on boom" },
      { label: "Boom length", value: "13.0 m" },
    ],
    // MAG is now bus-relative; this anchor field is documentation only.
    anchor: new THREE.Vector3(1.5, -1.5, -2.5),
    modelRadius: 1.5,
    busRelative: true,
  },

  {
    id: "iss",
    name: "Imaging Science Subsystem",
    shortName: "ISS",
    description:
      "Dual-camera visible-light imager: Narrow Angle Camera (NAC) and Wide Angle Camera (WAC). " +
      "Both use a 1024×1024 px front-illuminated CCD with 12-bit digitization (0–4095 DN). " +
      "NAC: f/10.5 Ritchey-Chrétien, 2002.7 mm focal length, 0.35°×0.35° FOV, 200–1050 nm, 24 filters. " +
      "WAC: f/3.5 refractor, 200.77 mm focal length, 3.5°×3.5° FOV, 380–1050 nm, 18 filters.",
    mass: 57.83,
    parent: "bus",
    stats: [
      { label: "Mass", value: "57.83 kg" },
      { label: "Detector", value: "1024×1024 px, 12 µm pixels, 12-bit CCD" },
      { label: "NAC FOV", value: "0.35° × 0.35° (6.134 mrad)" },
      { label: "NAC focal len", value: "2002.70 mm, f/10.5" },
      { label: "NAC spectral", value: "200 – 1050 nm (24 filters)" },
      { label: "WAC FOV", value: "3.5° × 3.5° (61.18 mrad)" },
      { label: "WAC focal len", value: "200.77 mm, f/3.5" },
      { label: "WAC spectral", value: "380 – 1050 nm (18 filters)" },
      { label: "Exposure range", value: "5 ms – 1200 s (64 settings)" },
    ],
    anchor: new THREE.Vector3(0.067, 0.624, 0.06),
    modelRadius: 1.5,
    busRelative: false,
  },

  {
    id: "radar",
    name: "RADAR",
    shortName: "RADAR",
    description:
      "Ku-band (13,776.5 MHz) synthetic aperture radar and altimeter. Uses the High-Gain Antenna as aperture. " +
      "The only instrument that could penetrate Titan's optically opaque atmosphere to map the surface. " +
      "Altimetry resolution: 40 m vertical at 24 km altitude.",
    mass: 41.43,
    parent: "bus",
    stats: [
      { label: "Mass", value: "41.43 kg" },
      { label: "Band", value: "Ku-band — 13,776.5 MHz" },
      { label: "HGA gain", value: "49.8 dBi" },
      { label: "Alt. res.", value: "40 m at 24 km altitude" },
      { label: "Aperture", value: "High-Gain Antenna (4.0 m)" },
    ],
    anchor: new THREE.Vector3(0, 1.143, 0),
    modelRadius: 1.5,
    busRelative: false,
  },

  // Secondary: bus-relative offsets in spacecraft-local space (+Y toward
  // HGA, +Z forward/instrument face), rotated each frame by
  // useLiveLabelAnchors so they track rotation without individual mesh refs.

  {
    id: "vims",
    name: "Visible and Infrared Mapping Spectrometer",
    shortName: "VIMS",
    description:
      "Two channels: VIMS-V (visible, 0.35–1.05 µm, 96 bands) " +
      "and VIMS-IR (infrared, 0.85–5.1 µm, 256 bands). Used to map the composition of " +
      "Saturn's rings, Titan's surface through its haze, and the atmospheres of Saturn and its moons.",
    mass: 37.14,
    parent: "bus",
    stats: [
      { label: "Mass", value: "37.14 kg" },
      { label: "VIMS-V range", value: "0.35 – 1.05 µm (96 bands)" },
      { label: "VIMS-IR range", value: "0.85 – 5.1 µm (256 bands)" },
      { label: "Target", value: "Composition mapping (rings, Titan, Saturn)" },
    ],
    anchor: new THREE.Vector3(0.55, 0.3, 0.5),
    modelRadius: 1.2,
    busRelative: true,
  },

  {
    id: "cirs",
    name: "Composite Infrared Spectrometer",
    shortName: "CIRS",
    description:
      "Covers 7–1,000 µm (far-infrared through mid-infrared). " +
      "Measured temperature profiles and composition of Saturn's and Titan's atmospheres, " +
      "and the thermal properties of ring particles.",
    mass: 39.24,
    parent: "bus",
    stats: [
      { label: "Mass", value: "39.24 kg" },
      { label: "Spectral range", value: "7 – 1,000 µm" },
      { label: "Science", value: "Thermal mapping — atmosphere & rings" },
    ],
    anchor: new THREE.Vector3(-0.55, 0.3, 0.5),
    modelRadius: 1.2,
    busRelative: true,
  },

  {
    id: "inms",
    name: "Ion and Neutral Mass Spectrometer",
    shortName: "INMS",
    description:
      "Sampled the composition of Saturn's upper atmosphere, " +
      "Titan's ionosphere, and the plumes of Enceladus during close flybys. " +
      "Used quadrupole mass analysis to identify molecular species.",
    mass: 9.25,
    parent: "bus",
    stats: [
      { label: "Mass", value: "9.25 kg" },
      {
        label: "Target",
        value: "Atmospheric & plume composition (ionized + neutral species)",
      },
    ],
    anchor: new THREE.Vector3(0.2, 0.5, 0.65),
    modelRadius: 1.2,
    busRelative: true,
  },

  {
    id: "uvis",
    name: "Ultraviolet Imaging Spectrograph",
    shortName: "UVIS",
    description:
      "Covered 56–190 nm (EUV) and 110–190 nm (FUV). " +
      "Measured atmospheric and ring compositions via stellar and solar occultations, " +
      "and detected auroral emissions at Saturn and Titan.",
    mass: 15.43,
    parent: "bus",
    stats: [
      { label: "Mass", value: "15.43 kg" },
      { label: "EUV range", value: "56 – 190 nm" },
      { label: "FUV range", value: "110 – 190 nm" },
      {
        label: "Science",
        value: "Atmospheric occultations, ring occultations, aurora",
      },
    ],
    anchor: new THREE.Vector3(0.65, 0.1, 0.3),
    modelRadius: 1.2,
    busRelative: true,
  },

  {
    id: "rpws",
    name: "Radio and Plasma Wave Science",
    shortName: "RPWS",
    description:
      "Three electric field antennas (magnetometer boom-mounted) " +
      "and a magnetic search coil. Detected Saturn's lightning (SED bursts), measured plasma " +
      "waves in the magnetosphere, and observed Titan's ionosphere during 127 flybys.",
    mass: 6.8,
    parent: "bus",
    stats: [
      { label: "Mass", value: "6.80 kg" },
      {
        label: "Sensors",
        value: "3 electric field antennae + magnetic search coil",
      },
      {
        label: "Science",
        value: "Plasma waves, SED lightning, Titan ionosphere",
      },
    ],
    // RPWS: the three electric-field antennas mount on the upper bus near
    // the HGA base, so the visible RPWS anchor sits HIGH on the model
    // (positive Y, near top of bus body). Side bias picks one of the booms.
    anchor: new THREE.Vector3(0.3, 0.75, 0.0),
    modelRadius: 1.2,
    busRelative: true,
  },

  {
    id: "caps",
    name: "Cassini Plasma Spectrometer",
    shortName: "CAPS",
    description:
      "Three sensors — Electron Spectrometer (ELS), " +
      "Ion Beam Spectrometer (IBS), and Ion Mass Spectrometer (IMS) — to characterize " +
      "the charged-particle populations in Saturn's magnetosphere and Titan's ionosphere.",
    mass: 12.5,
    parent: "bus",
    stats: [
      { label: "Mass", value: "12.50 kg" },
      { label: "Sensors", value: "ELS + IBS + IMS" },
      { label: "Science", value: "Magnetospheric plasma & Titan ionosphere" },
    ],
    // CAPS sits on the UPPER-LEFT face of the bus body (per reference photo),
    // just below the HGA mount. Slight forward bias to face the camera in
    // front-style inspection views.
    anchor: new THREE.Vector3(-0.35, 0.4, 0.2),
    modelRadius: 1.2,
    busRelative: true,
  },

  {
    id: "mimi",
    name: "Magnetospheric Imaging Instrument",
    shortName: "MIMI",
    description:
      "Three sensors: CHEMS (charge-energy-mass " +
      "spectrometer), INCA (ion and neutral camera), and LEMMS (low-energy magnetospheric " +
      "measurement system). Produced the first global images of Saturn's magnetosphere " +
      "in energetic neutral atoms.",
    mass: 16.0,
    parent: "bus",
    stats: [
      { label: "Mass", value: "16.00 kg" },
      { label: "Sensors", value: "CHEMS + INCA + LEMMS" },
      { label: "Science", value: "First ENA images of Saturn magnetosphere" },
    ],
    anchor: new THREE.Vector3(0.65, -0.1, -0.25),
    modelRadius: 1.2,
    busRelative: true,
  },

  {
    id: "cda",
    name: "Cosmic Dust Analyzer",
    shortName: "CDA",
    description:
      "Detected and characterized dust grains striking the detector " +
      "at up to 70 km/s. Key discovery: ice grains from Enceladus's south polar plumes " +
      "are the primary source material for Saturn's E ring.",
    mass: 16.36,
    parent: "bus",
    stats: [
      { label: "Mass", value: "16.36 kg" },
      {
        label: "Key find",
        value: "Enceladus plume ice → E-ring source material",
      },
    ],
    // CDA: mounted on the lower equipment module at the BOTTOM of the
    // spacecraft (negative Y, well below bus center). Slight side offset
    // so the dot doesn't overlap with the bus-anchor projection on most
    // camera angles.
    anchor: new THREE.Vector3(-0.1, -0.7, 0.05),
    modelRadius: 1.2,
    busRelative: true,
  },

  {
    id: "lga1",
    name: "Low-Gain Antenna 1",
    shortName: "LGA-1",
    description:
      "Wide-angle X-band low-gain antenna mounted on top of the HGA dish. " +
      "Used when the High-Gain Antenna could not be pointed toward Earth, particularly " +
      "during Sun-pointed thermal protection attitudes and spacecraft safe-mode operations.",
    mass: 1.5,
    parent: "hga",
    stats: [
      { label: "Band", value: "X" },
      { label: "Up-Down link", value: "7,175 MHz – 8,425 MHz" },
      { label: "Up-Down gain", value: "8.44 – 8.94 dBi" },
      { label: "Beamwidth", value: "~32° (up), ~24° (down)" },
      { label: "Type", value: "Corrugated cylindrical waveguide" },
    ],
    // Dot position is authoritative in labelOffsets.ts SECONDARY_OFFSETS.lga1.
    anchor: new THREE.Vector3(0, 1.0, 0),
    modelRadius: 1.0,
    busRelative: true,
  },

  {
    id: "rss",
    name: "Radio Science Subsystem",
    shortName: "RSS",
    description:
      "Uses the HGA to send coherent X-band (8.4 GHz) and Ka-band " +
      "(32 GHz) signals through Saturn's atmosphere and rings for occultation experiments. " +
      "Also conducts gravitational experiments via precision Doppler tracking.",
    mass: 14.38,
    parent: "bus",
    stats: [
      { label: "Mass", value: "14.38 kg" },
      { label: "X-band down", value: "8,425 MHz — 46.6 dBi" },
      { label: "Ka-band down", value: "32,028 MHz — 56.4 dBi" },
      { label: "Science", value: "Occultations, gravity, ring structure" },
    ],
    anchor: new THREE.Vector3(-0.2, 0.5, -0.3),
    modelRadius: 1.2,
    busRelative: true,
  },
];

export function getComponent(id: string): ComponentMetadata | undefined {
  return COMPONENTS.find((c) => c.id === id);
}

// Satellites catalog
export interface SatelliteMetadata {
  name: string;
  diameter: number;
  distance: number;
}

export const SATELLITES: SatelliteMetadata[] = [
  { name: "Pan", diameter: 20, distance: 133583 },
  { name: "Atlas", diameter: 32, distance: 137640 },
  { name: "Prometheus", diameter: 100, distance: 139350 },
  { name: "Pandora", diameter: 84, distance: 141700 },
  { name: "Epimetheus", diameter: 119, distance: 151422 },
  { name: "Janus", diameter: 178, distance: 151472 },
  { name: "Mimas", diameter: 392, distance: 185520 },
  { name: "Enceladus", diameter: 499, distance: 238020 },
  { name: "Tethys", diameter: 1060, distance: 294660 },
  { name: "Telesto", diameter: 22, distance: 294660 },
  { name: "Calypso", diameter: 20, distance: 294660 },
  { name: "Dione", diameter: 1120, distance: 377400 },
  { name: "Helene", diameter: 35, distance: 378400 },
  { name: "Rhea", diameter: 1528, distance: 527040 },
  { name: "Titan", diameter: 5150, distance: 1221850 },
  { name: "Hyperion", diameter: 283, distance: 1481100 },
  { name: "Iapetus", diameter: 1436, distance: 3561300 },
  { name: "Phoebe", diameter: 220, distance: 12952000 },
];

// HGA Link Budget
export interface LinkBudgetData {
  band: string;
  frequency: number;
  gain: number;
  beamwidth: number;
}

export const LINK_BUDGET: LinkBudgetData[] = [
  {
    band: "X-band Command (up)",
    frequency: 7175,
    gain: 44.7,
    beamwidth: 0.555,
  },
  {
    band: "X-band Telemetry (down)",
    frequency: 8425,
    gain: 46.6,
    beamwidth: 0.635,
  },
  {
    band: "S-band Relay Chain A (up)",
    frequency: 2040,
    gain: 34.7,
    beamwidth: 2.425,
  },
  {
    band: "S-band Relay Chain B (up)",
    frequency: 2098,
    gain: 35.3,
    beamwidth: 2.28,
  },
  {
    band: "S-band Radio Sci (down)",
    frequency: 2298,
    gain: 35.8,
    beamwidth: 2.125,
  },
  {
    band: "Ka-band Radio Sci (up)",
    frequency: 34316,
    gain: 54.1,
    beamwidth: 0.164,
  },
  {
    band: "Ka-band Radio Sci (down)",
    frequency: 32028,
    gain: 56.4,
    beamwidth: 0.167,
  },
  {
    band: "Ku-band RADAR (up/down)",
    frequency: 13776.5,
    gain: 49.8,
    beamwidth: 0,
  },
];
