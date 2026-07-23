**Legend**

| Symbol  | Meaning                                                       |
| ------- | ------------------------------------------------------------- |
| GOOD    | Verified and ready to use                                     |
| CITE    | Web-confirmed but lacks a formal citable source               |
| WRONG   | Confirmed incorrect — do not use; corrected value is recorded |
| MISSING | Entirely missing — must be sourced                            |

---

## 1. Spacecraft Geometry & Mass

### 1.1 Physical Dimensions

_Required for: procedural geometry scale ratios in `CassiniBus.tsx`, `HighGainAntenna.tsx`, `RTGBoom.tsx`_

| Parameter                | Status | Verified Value | Source       |
| ------------------------ | ------ | -------------- | ------------ |
| Orbiter height           | GOOD   | 6.7 m          | `tables.pdf` |
| Orbiter width            | GOOD   | 4.0 m          | `tables.pdf` |
| HGA diameter             | GOOD   | 4.0 m          | `tables.pdf` |
| Magnetometer boom length | GOOD   | 13.0 m         | `tables.pdf` |
| Huygens probe diameter   | GOOD   | 2.7 m          | `tables.pdf` |

### 1.2 Mass Specifications

_Required for: InfoPanel mission stats_

| Parameter                        | Status | Verified Value | Source       |
| -------------------------------- | ------ | -------------- | ------------ |
| Fueled mass at launch            | GOOD   | 5,712 kg       | `tables.pdf` |
| Dry mass (orbiter only)          | GOOD   | 2,125 kg       | `tables.pdf` |
| Propellant loaded                | GOOD   | 3,132 kg       | `tables.pdf` |
| Propellant used (end of mission) | GOOD   | 2,950 kg       | `tables.pdf` |
| Huygens probe mass               | GOOD   | 350 kg         | `tables.pdf` |

### 1.3 Telecom Hardware Masses

_Required for: `components.ts` subsystem metadata_

| Component                      | Status | Verified Value | Source       |
| ------------------------------ | ------ | -------------- | ------------ |
| Deep Space Transponder (×2)    | GOOD   | 8.0 kg         | `tables.pdf` |
| Command Detector Unit (×2)     | GOOD   | 0.7 kg         | `tables.pdf` |
| Telemetry Control Unit         | GOOD   | 5.1 kg         | `tables.pdf` |
| Ultra Stable Oscillator        | GOOD   | 1.8 kg         | `tables.pdf` |
| X-band TWTA-active (×2)        | GOOD   | 10.8 kg        | `tables.pdf` |
| Waveguide Transfer Switch (×4) | GOOD   | 1.5 kg         | `tables.pdf` |
| X-band Diplexer (×2)           | GOOD   | 3.4 kg         | `tables.pdf` |
| 3 dB Hybrid Coupler (×1)       | GOOD   | 0.1 kg         | `tables.pdf` |

---

## 2. Instrument Payload

### 2.1 Instrument Masses

_Required for: `components.ts` metadata, InfoPanel labels_

| Instrument                                | Acronym | Status  | Verified Value | Source                                            |
| ----------------------------------------- | ------- | ------- | -------------- | ------------------------------------------------- |
| Radio Detection and Ranging               | RADAR   | GOOD    | 41.43 kg       | NASA instrument page                              |
| Ion and Neutral Mass Spectrometer         | INMS    | GOOD    | 9.25 kg        | NASA instrument page                              |
| Radio and Plasma Wave Science             | RPWS    | GOOD    | 6.80 kg        | NASA instrument page                              |
| Composite Infrared Spectrometer           | CIRS    | CITE    | 39.24 kg       | Web-confirmed; not yet in a provided source file  |
| Imaging Science Subsystem (combined)      | ISS     | CITE    | 57.83 kg       | Web-confirmed; PDS catalog + Final Mission Report |
| Visible and Infrared Mapping Spectrometer | VIMS    | CITE    | 37.14 kg       | Web-confirmed; NASA instrument page               |
| Cassini Plasma Spectrometer               | CAPS    | MISSING | —              | Not yet sourced                                   |
| Cosmic Dust Analyzer                      | CDA     | MISSING | —              | Not yet sourced                                   |
| Dual Technique Magnetometer               | MAG     | MISSING | —              | Not yet sourced                                   |
| Magnetospheric Imaging Instrument         | MIMI    | MISSING | —              | Not yet sourced                                   |
| Ultraviolet Imaging Spectrograph          | UVIS    | MISSING | —              | Not yet sourced                                   |
| Radio Science Subsystem                   | RSS     | MISSING | —              | Not yet sourced                                   |

### 2.2 Instrument Operational Ranges

_Required for: `components.ts`, InfoPanel technical readouts_

| Instrument | Parameter            | Status | Verified Value         | Source            |
| ---------- | -------------------- | ------ | ---------------------- | ----------------- |
| CIRS       | Wavelength range     | GOOD   | 7 – 1,000 µm           | `tables.pdf`      |
| DISR       | Wavelength range     | GOOD   | 350 – 1,700 nm         | `tables.pdf`      |
| VIMS-V     | Wavelength range     | GOOD   | 0.35 – 1.05 µm         | `CASSINI_VIMS.md` |
| VIMS-IR    | Wavelength range     | GOOD   | 0.85 – 5.1 µm          | `CASSINI_VIMS.md` |
| GCMS       | Mass range           | GOOD   | 2 – 146 amu / Dalton   | `tables.pdf`      |
| GCMS       | Dynamic range        | GOOD   | > 10⁸                  | `tables.pdf`      |
| RADAR      | Altimetry resolution | GOOD   | 40 m at 24 km altitude | `tables.pdf`      |

### 2.3 ISS Camera Parameters — General

_Required for: InfoPanel camera readouts_

| Parameter              | Status | Verified Value                          | Source                        |
| ---------------------- | ------ | --------------------------------------- | ----------------------------- |
| Processor              | GOOD   | IBM MIL-STD-1750A 16-bit                | `CASSINI_ISS_Camera_specs.md` |
| Detector type          | GOOD   | 3-phase, front-side illuminated CCD     | `CASSINI_ISS_Camera_specs.md` |
| Detector format        | GOOD   | 1024 × 1024 px, 12 µm pixels            | `CASSINI_ISS_Camera_specs.md` |
| Signal digitization    | GOOD   | 12-bit (0 – 4095 DN)                    | `CASSINI_ISS_Camera_specs.md` |
| Compression            | GOOD   | Lossless and lossy                      | `CASSINI_ISS_Camera_specs.md` |
| On-chip summing modes  | GOOD   | 1×1, 2×2, 4×4                           | `CASSINI_ISS_Camera_specs.md` |
| Exposure range         | GOOD   | 5 ms – 1200 s (64 commandable settings) | `CASSINI_ISS_Camera_specs.md` |
| Minimum framing time   | GOOD   | 11 seconds                              | `CASSINI_ISS_Camera_specs.md` |
| Read noise (high gain) | GOOD   | 12 electrons                            | `CASSINI_ISS_Camera_specs.md` |

### 2.4 ISS — Narrow Angle Camera (NAC)

| Parameter         | Status | Verified Value                               | Source                        |
| ----------------- | ------ | -------------------------------------------- | ----------------------------- |
| Field of view     | GOOD   | 0.35° × 0.35° (6.134 mrad)                   | `CASSINI_ISS_Camera_specs.md` |
| Optical design    | GOOD   | f/10.5 Ritchey-Chrétien reflecting telescope | `CASSINI_ISS_Camera_specs.md` |
| Focal length      | GOOD   | 2002.70 ± 0.07 mm                            | `CASSINI_ISS_Camera_specs.md` |
| Image scale       | GOOD   | 5.9907 µrad/pixel                            | `CASSINI_ISS_Camera_specs.md` |
| Spectral range    | GOOD   | 200 – 1050 nm                                | `CASSINI_ISS_Camera_specs.md` |
| Number of filters | GOOD   | 24 (across two filter wheels)                | `CASSINI_ISS_Camera_specs.md` |
| PSF FWHM          | GOOD   | 1.3 pixels                                   | `CASSINI_ISS_Camera_specs.md` |

### 2.5 ISS — Wide Angle Camera (WAC)

| Parameter         | Status | Verified Value                                         | Source                        |
| ----------------- | ------ | ------------------------------------------------------ | ----------------------------- |
| Field of view     | GOOD   | 3.5° × 3.5° (61.18 mrad)                               | `CASSINI_ISS_Camera_specs.md` |
| Optical design    | GOOD   | f/3.5 color-corrected refractor (Voyager flight spare) | `CASSINI_ISS_Camera_specs.md` |
| Focal length      | GOOD   | 200.77 ± 0.02 mm                                       | `CASSINI_ISS_Camera_specs.md` |
| Image scale       | GOOD   | 59.749 µrad/pixel                                      | `CASSINI_ISS_Camera_specs.md` |
| Spectral range    | GOOD   | 380 – 1050 nm                                          | `CASSINI_ISS_Camera_specs.md` |
| Number of filters | GOOD   | 18 (across two filter wheels)                          | `CASSINI_ISS_Camera_specs.md` |
| PSF FWHM          | GOOD   | 1.8 pixels                                             | `CASSINI_ISS_Camera_specs.md` |

---

## 3. Telecommunications

### 3.1 HGA Link Budget

_Required for: InfoPanel telecom readouts, `HuygensTelemetryEffect.ts` shader uniforms_

| Band                         | Frequency    | HGA Gain | Beamwidth | Status |
| ---------------------------- | ------------ | -------- | --------- | ------ |
| X-band Command (up)          | 7,175 MHz    | 44.7 dBi | 0.555°    | GOOD   |
| X-band Telemetry (down)      | 8,425 MHz    | 46.6 dBi | 0.635°    | GOOD   |
| S-band Relay Chain A (up)    | 2,040 MHz    | 34.7 dBi | 2.425°    | GOOD   |
| S-band Relay Chain B (up)    | 2,098 MHz    | 35.3 dBi | 2.280°    | GOOD   |
| S-band Radio Science (down)  | 2,298 MHz    | 35.8 dBi | 2.125°    | GOOD   |
| Ka-band Radio Science (up)   | 34,316 MHz   | 54.1 dBi | 0.164°    | GOOD   |
| Ka-band Radio Science (down) | 32,028 MHz   | 56.4 dBi | 0.167°    | GOOD   |
| Ku-band Radar (up/down)      | 13,776.5 MHz | 49.8 dBi | N/A       | GOOD   |

### 3.2 Hardware Power Consumption

| Component               | Status | Verified Value | Source       |
| ----------------------- | ------ | -------------- | ------------ |
| Deep Space Transponder  | GOOD   | 10.2 W         | `tables.pdf` |
| X-band TWTA (active)    | GOOD   | 53.7 W         | `tables.pdf` |
| X-band TWTA (sleep)     | GOOD   | 13.0 W         | `tables.pdf` |
| Ultra Stable Oscillator | GOOD   | 3.0 W          | `tables.pdf` |

### 3.3 Huygens Relay Link Parameters

_Required for: `HuygensTelemetryEffect.ts`, Derivation §7, `stateAt.ts` signal decay curve_

| Parameter                            | Status | Verified Value                       | Source                                       |
| ------------------------------------ | ------ | ------------------------------------ | -------------------------------------------- |
| Link band                            | GOOD   | S-band                               | `cassini_data.md`                            |
| Chain A carrier frequency            | GOOD   | 2,040 MHz                            | `cassini_data.md`                            |
| Chain B carrier frequency            | GOOD   | 2,098 MHz                            | `cassini_data.md`                            |
| Number of relay channels             | GOOD   | 2 (Chain A and Chain B)              | `cassini_data.md`                            |
| Relay data bit rate (per channel)    | CITE   | 8,192 bps                            | Web-confirmed; needs formal JPL/ESA citation |
| Modulation index                     | GOOD   | 1.34 radians                         | `Huygens_telemetry.md`                       |
| Temporal offset between chains       | GOOD   | ~6 seconds                           | `Huygens_telemetry.md`                       |
| Probe antenna gain (on-boresight)    | GOOD   | +5 dBi @ 2040 MHz; +3 dBi @ 2098 MHz | `Huygens_telemetry.md`                       |
| Gain variation at ~60° off-boresight | GOOD   | 3 dB peak-to-peak                    | `Huygens_telemetry.md`                       |
| HGA pointing loss (relay ops)        | GOOD   | ≤ 0.5 dB                             | `Huygens_telemetry.md`                       |
| End-to-end frame error rate (design) | GOOD   | 10⁻⁵                                 | `Huygens_telemetry.md`                       |

### 3.4 Huygens Doppler Anomaly

_Required for: InfoPanel historical notes_

| Event               | Status | Detail                                                                                 | Source                 |
| ------------------- | ------ | -------------------------------------------------------------------------------------- | ---------------------- |
| Anomaly discovered  | GOOD   | February 2000 — bit synchronizer could not handle predicted Doppler shift              | `Huygens_telemetry.md` |
| Root cause          | GOOD   | Hardware limitation; receiver bandwidth too narrow for probe-orbiter relative velocity | `Huygens_telemetry.md` |
| Resolution          | GOOD   | New trajectory profiles approved June 2001                                             | `Huygens_telemetry.md` |
| Channel A data loss | GOOD   | Receiver never commanded on — command omitted from ESA sequence                        | `cassini_data.md`      |

---

## 4. Mission Timeline & Phase Anchors

_Required for: `phases.ts`, Timeline UI phase markers, `stateAt.ts` T-value mapping_

### 4.1 Interplanetary Cruise

| Event         | Status | Verified Date / Value          | Source       |
| ------------- | ------ | ------------------------------ | ------------ |
| Launch        | GOOD   | October 15, 1997               | `tables.pdf` |
| Venus flyby 1 | GOOD   | April 26, 1998 at 234 km       | `tables.pdf` |
| Venus flyby 2 | GOOD   | June 24, 1999 at 600 km        | `tables.pdf` |
| Earth flyby   | GOOD   | August 18, 1999 at 1,171 km    | `tables.pdf` |
| Jupiter flyby | GOOD   | December 30, 2000 at 10×10⁶ km | `tables.pdf` |

### 4.2 Saturn Operations

| Event                       | Status | Verified Date / Value | Source          |
| --------------------------- | ------ | --------------------- | --------------- |
| Saturn Orbit Insertion      | GOOD   | July 1, 2004          | `tables.pdf`    |
| Primary mission orbit count | GOOD   | 74 orbits             | `tables.pdf`    |
| Targeted Titan flybys       | GOOD   | 127 flybys            | `tables.pdf`    |
| Huygens separation          | GOOD   | December 25, 2004     | (Wikipedia/ESA) |
| Huygens Titan entry         | GOOD   | January 14, 2005      | (Wikipedia/ESA) |

### 4.3 Grand Finale — Detailed Ring-Crossing Timeline

_Required for: ring-crossing effect triggers in `stateAt.ts` — all 22 events are now confirmed_
_(All entries GOOD from `cassini_grand_finale_timeline.md`)_

| Crossing #                  | Date         | Spacecraft UTC | Notes                                         |
| --------------------------- | ------------ | -------------- | --------------------------------------------- |
| 1                           | Apr 26, 2017 | 9:00 a.m.      | HGA shielded spacecraft                       |
| 2                           | May 2, 2017  | 7:38 p.m.      |                                               |
| 3                           | May 9, 2017  | 6:13 a.m.      | Communicated during crossing                  |
| 4                           | May 15, 2017 | 4:42 p.m.      | Communicated during crossing                  |
| 5                           | May 22, 2017 | 3:11 a.m.      | Communicated during crossing                  |
| 6                           | May 28, 2017 | 2:22 p.m.      | Farthest D-ring venture; HGA shielded         |
| 7                           | Jun 4, 2017  | 1:38 a.m.      | Second closest D-ring; HGA shielded           |
| 8                           | Jun 10, 2017 | 12:49 p.m.     | Communicated during crossing                  |
| 9                           | Jun 16, 2017 | 11:52 p.m.     |                                               |
| 10                          | Jun 23, 2017 | 10:54 a.m.     | Communicated during crossing                  |
| 11                          | Jun 29, 2017 | 10:10 p.m.     | Ventured into D ring; spacecraft NOT shielded |
| 12                          | Jul 6, 2017  | 9:31 a.m.      | D ring; HGA shielded                          |
| 13                          | Jul 12, 2017 | 8:44 p.m.      |                                               |
| 14                          | Jul 19, 2017 | 7:50 a.m.      | Communicated during crossing                  |
| 15                          | Jul 25, 2017 | 6:55 p.m.      |                                               |
| 16                          | Aug 1, 2017  | 6:05 a.m.      |                                               |
| 17                          | Aug 7, 2017  | 5:19 p.m.      |                                               |
| Final Five — Periapse Dip 1 | Aug 14, 2017 | 4:22 a.m.      | First atmospheric dip                         |
| Final Five — Periapse Dip 2 | Aug 20, 2017 | 3:23 p.m.      |                                               |
| Final Five — Periapse Dip 3 | Aug 27, 2017 | 2:20 a.m.      | Third and lowest dip                          |
| Final Five — Periapse Dip 4 | Sep 2, 2017  | 1:17 p.m.      |                                               |
| Final Five — Periapse Dip 5 | Sep 9, 2017  | 12:18 a.m.     | Last atmospheric dip                          |

> **Important:** The current `stateAt.ts` only encodes 5 ring-crossing spike events. I now have the exact UTC timestamps for all 22. The 22 dates need to be converted to normalized T-values and the `ringCrossing` effect array expanded accordingly.

### 4.4 Terminal Events

| Event                                        | Status | Verified Date / Value             | Source                             |
| -------------------------------------------- | ------ | --------------------------------- | ---------------------------------- |
| Grand Finale apoapse (start of final plunge) | GOOD   | September 12, 2017, 5:27 a.m.     | `cassini_grand_finale_timeline.md` |
| Atmospheric entry begins                     | GOOD   | September 15, 2017, 10:31 a.m.    | `cassini_grand_finale_timeline.md` |
| Final entry (definitive)                     | GOOD   | September 15, 2017, 10:44 a.m.    | `cassini_grand_finale_timeline.md` |
| Loss of signal                               | GOOD   | September 15, 2017, 10:45 a.m.    | `cassini_grand_finale_timeline.md` |
| Grand Finale total dive count                | GOOD   | 22 dives                          | `tables.pdf`                       |
| Grand Finale dive altitudes                  | GOOD   | 1,600 – 4,000 km above cloud tops | `tables.pdf`                       |

### 4.5 T-Value Mapping — NOT YET DONE

| Item                                      | Status  | Notes                                                                                                                                                                                                                                                                                          |
| ----------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real mission dates → normalized T mapping | MISSING | The real dates are all confirmed above. The conversion formula is straightforward — `T = (date − launch) / (impact − launch)` — but the formal mapping document for `phases.ts` has not been written yet. This is the single remaining blocker for the Timeline UI and accurate phase markers. |

---

## 5. Astrodynamics & Celestial Bodies

### 5.1 Saturn Physical Properties

_Required for: Saturn background mesh scale, InfoPanel_

| Property              | Status | Verified Value | Source       |
| --------------------- | ------ | -------------- | ------------ |
| Equatorial radius     | GOOD   | 60,268 km      | `tables.pdf` |
| Polar radius          | GOOD   | 54,364 km      | `tables.pdf` |
| Cloud-top temperature | GOOD   | −139°C         | `tables.pdf` |

### 5.2 Saturn Ring System

_Required for: ring plane geometry scale, ring-crossing visual triggers_

| Ring | Inner Edge from Center | Width           | Status            |
| ---- | ---------------------- | --------------- | ----------------- |
| D    | 66,970 km              | 7,540 km        | GOOD `tables.pdf` |
| C    | 74,510 km              | 17,490 km       | GOOD `tables.pdf` |
| B    | 92,000 km              | 25,580 km       | GOOD `tables.pdf` |
| A    | 122,170 km             | 14,610 km       | GOOD `tables.pdf` |
| F    | 140,180 km             | 50 km           | GOOD `tables.pdf` |
| G    | 170,180 km             | 500 – 1,000+ km | GOOD `tables.pdf` |
| E    | 181,000 km             | 302,000 km      | GOOD `tables.pdf` |

### 5.3 Major Satellite Catalog

_Required for: InfoPanel moon data, trajectory context labels_
_(All entries GOOD from `tables.pdf`)_

| Satellite  | Diameter (km) | Orbital Distance (km) |
| ---------- | ------------- | --------------------- |
| Pan        | 20            | 133,583               |
| Atlas      | 32            | 137,640               |
| Prometheus | 100           | 139,350               |
| Pandora    | 84            | 141,700               |
| Epimetheus | 119           | 151,422               |
| Janus      | 178           | 151,472               |
| Mimas      | 392           | 185,520               |
| Enceladus  | 499           | 238,020               |
| Tethys     | 1,060         | 294,660               |
| Telesto    | 22            | 294,660               |
| Calypso    | 20            | 294,660               |
| Dione      | 1,120         | 377,400               |
| Helene     | 35            | 378,400               |
| Rhea       | 1,528         | 527,040               |
| Titan      | 5,150         | 1,221,850             |
| Hyperion   | 283           | 1,481,100             |
| Iapetus    | 1,436         | 3,561,300             |
| Phoebe     | 220           | 12,952,000            |

---

## 6. Entry & Disintegration Physics

### 6.1 Huygens — Titan Entry

_Required for: InfoPanel thermal display, `TitanHazeEffect.ts` intensity scale_

| Parameter                            | Status | Verified Value                            | Source                |
| ------------------------------------ | ------ | ----------------------------------------- | --------------------- |
| Heat shield material                 | GOOD   | AQ60 — silica fibre felt + phenolic resin | `cassini_data.md`     |
| Front shield geometry                | GOOD   | 60° half-angle coni-spherical             | `cassini_data.md`     |
| Front shield diameter                | GOOD   | 2.7 m                                     | `cassini_data.md`     |
| Front shield mass                    | GOOD   | ~79 kg                                    | `cassini_data.md`     |
| Shock layer peak temperature         | GOOD   | 12,000°C                                  | ESA "Hot Shield" page |
| AQ60 shield surface peak temperature | GOOD   | 1,800°C                                   | ESA                   |

### 6.2 Cassini — Grand Finale Saturn Entry

_Required for: `DisintegrationMaterial.ts` uBurnAmount calibration, Derivation §7_

| Parameter                                | Status  | Verified Value                                  | Source                                               |
| ---------------------------------------- | ------- | ----------------------------------------------- | ---------------------------------------------------- |
| Entry speed at signal loss               | GOOD    | 111,637 kph (69,368 mph)                        | `tables.pdf`                                         |
| Atmospheric entry altitude               | GOOD    | 1,920 km                                        | `tables.pdf`                                         |
| Communication severing altitude          | GOOD    | 1,500 km above cloud tops                       | `tables.pdf`                                         |
| Saturn atmospheric scale height (H)      | MISSING | MISSING — ~59.5 km estimated but needs citation | Required for Derivation Eq. 11: `ρ(h) = ρ₀·e^(−h/H)` |
| Saturn reference density (ρ₀)            | MISSING | MISSING                                         | Required for same equation                           |
| MLI Mylar melt temperature               | MISSING | MISSING                                         | Not yet sourced from materials datasheet             |
| Kapton decomposition onset temperature   | MISSING | MISSING                                         | Not yet sourced from materials datasheet             |
| 7075-T6 Al 50% strength loss temperature | MISSING | MISSING                                         | Not yet sourced                                      |
| 7075-T6 Al liquidus (melt) range         | MISSING | MISSING                                         | Not yet sourced                                      |

---

## 7. Mathematical Derivations

_Status: All derivations in `cassini_derivations_v2.pdf` are written and internally consistent._

| Derivation                                                               | Status | Notes                                                                         |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| §1 — Temporal integration (Euler method, `currentT` update)              | GOOD   | Complete and consistent with blueprint                                        |
| §2 — `easeOutBackSoft` overshoot calculus                                | GOOD   | Complete                                                                      |
| §3 — Dot-product occlusion / horizon culling                             | GOOD   | Threshold cos θ > −0.35 (≈110.48°) formally derived                           |
| §4 — Quaternion SLERP for attitude kinematics                            | GOOD   | Complete; resolves the gimbal lock issue at SOI retrograde                    |
| §5 — Catmull-Rom spline basis matrix for ephemeris continuity            | GOOD   | Basis matrix derived; C1 continuity proven                                    |
| §6 — Logarithmic depth buffer transformation                             | GOOD   | Formula for z′ derived; justifies `logarithmicDepthBuffer: true`              |
| §7 — Aerodynamic heating rate model for disintegration                   | GOOD   | Equation derived; **awaits ρ₀ and H values** (Section 6.2 above) to be usable |
| §8 — Huygens Keplerian trajectory (Newton-Raphson for eccentric anomaly) | GOOD   | Derivation complete; **awaits actual orbital elements** (Section 8.2 below)   |

---

## 8. Code Data Files — Population Status

_Files from the blueprint that require real mission data to be populated_

| File                                    | Blueprint Section | Status  | Blocker                                                                   |
| --------------------------------------- | ----------------- | ------- | ------------------------------------------------------------------------- |
| `phases.ts` — timeline anchors          | §3, `stateAt.ts`  | CITE    | Dates confirmed GOOD but T-value mapping not yet formalized (see §4.5)    |
| `components.ts` — component metadata    | §5 UI / Labels    | CITE    | CAPS, CDA, MAG, MIMI, UVIS, RSS masses still MISSING                      |
| `orientationKeys.ts` — Euler keyframes  | §3.3              | CITE    | Placeholder angles present; real JPL Horizons quaternion data not sourced |
| `stateAt.ts` — ring-crossing events     | §3.4              | CITE    | Only 5 events encoded; all 22 dates now confirmed and need T-mapping      |
| Huygens Keplerian orbital elements      | Derivation §8     | MISSING | No elements (e, a, i, Ω, ω, M₀) sourced for Huygens ballistic arc         |
| Catmull-Rom ephemeris control points    | Derivation §5     | MISSING | Requires JPL Horizons position vectors at key dates                       |
| Saturn disintegration constants (ρ₀, H) | Derivation §7     | MISSING | Saturn upper-atmosphere density profile not formally sourced              |

---

## 9. 3D Assets Audit

### 9.1 Models (Present)

| Asset                          | File                                        | Status |
| ------------------------------ | ------------------------------------------- | ------ |
| Full assembly                  | `Cassini Assembly.glb`                      | GOOD   |
| STL parts folder               | `Cassini_STL/` (zipped)                     | GOOD   |
| Cassini + Huygens combined (A) | `Cassini-Huygens (A).glb`                   | GOOD   |
| Cassini only, no Huygens (A)   | `Cassini-Huygens (A) (without Huygens).glb` | GOOD   |
| Huygens only, no Cassini (A)   | `Cassini-Huygens (A) (without Cassini).glb` | GOOD   |
| Combined (B variant)           | `Cassini-Huygens (B).glb`                   | GOOD   |

> I've found these GLB files are present but I haven't converted them yet.

### 9.2 Textures

| Asset          | File                     | Status |
| -------------- | ------------------------ | ------ |
| Saturn texture | `Saturn` (image)         | GOOD   |
| Titan texture  | `Saturn - Titan` (image) | GOOD   |

| Asset                           | Required by                   | Status  |
| ------------------------------- | ----------------------------- | ------- |
| Saturn ring texture / alpha map | Ring plane geometry rendering | MISSING |
| Titan atmosphere haze texture   | `TitanHazeEffect.ts`          | MISSING |
| Star / skybox cubemap           | Deep-space background         | MISSING |
| Saturn cloud-band normal map    | Saturn sphere material        | MISSING |

---
