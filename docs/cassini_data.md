# Cassini-Huygens Mission — Verified Technical Data SO FAR

> `XXX` = incorrect or unverified

---

## 1. Spacecraft Hardware — Instrument Parameters

### 1.1 Instrument Masses

| Instrument                                          | Acronym | Verified Mass |
| --------------------------------------------------- | ------- | ------------- |
| Composite Infrared Spectrometer                     | CIRS    | XXX           |
| Imaging Science Subsystem _(both cameras combined)_ | ISS     | XXX           |
| Visible and Infrared Mapping Spectrometer           | VIMS    | XXX           |
| Radio Detection and Ranging                         | RADAR   | **41.43 kg**  |
| Cassini Plasma Spectrometer                         | CAPS    | XXX           |
| Cosmic Dust Analyzer                                | CDA     | XXX           |
| Ion and Neutral Mass Spectrometer                   | INMS    | **9.25 kg**   |
| Dual Technique Magnetometer                         | MAG     | XXX           |
| Magnetospheric Imaging Instrument                   | MIMI    | XXX           |
| Radio and Plasma Wave Science                       | RPWS    | **6.80 kg**   |
| Ultraviolet Imaging Spectrograph                    | UVIS    | XXX           |
| Radio Science Subsystem                             | RSS     | XXX           |

---

### 1.2 ISS — General Camera Parameters

| Parameter                    | Verified Value                              |
| ---------------------------- | ------------------------------------------- |
| Processor                    | **IBM MIL-STD-1750A 16-bit**                |
| Detector type                | **3-phase, front-side illuminated CCD**     |
| Detector format              | **1024 × 1024 pixels**                      |
| Pixel size                   | **12 µm**                                   |
| Signal digitization          | **12-bit (0 – 4095 DN)**                    |
| Compression                  | **Lossless and lossy**                      |
| On-chip summing modes        | **1×1, 2×2, 4×4**                           |
| Exposure range               | **5 ms – 1200 s** (64 commandable settings) |
| Minimum framing time         | **11 seconds**                              |
| Read noise (high gain state) | **12 electrons**                            |

---

### 1.3 ISS — Narrow Angle Camera (NAC)

| Parameter         | Verified Value                                   |
| ----------------- | ------------------------------------------------ |
| Field of View     | **0.35° × 0.35° (6.134 mrad)**                   |
| Optical design    | **f/10.5 Ritchey-Chrétien reflecting telescope** |
| Focal length      | **2002.70 ± 0.07 mm**                            |
| Image scale       | **5.9907 µrad/pixel**                            |
| Spectral range    | **200 – 1050 nm**                                |
| Number of filters | **24 (across two filter wheels)**                |
| PSF FWHM          | **1.3 pixels**                                   |

---

### 1.4 ISS — Wide Angle Camera (WAC)

| Parameter         | Verified Value                                                             |
| ----------------- | -------------------------------------------------------------------------- |
| Field of View     | **3.5° × 3.5° (61.18 mrad)**                                               |
| Optical design    | **f/3.5 color-corrected refractor** _(Voyager flight spare optical train)_ |
| Focal length      | **200.77 ± 0.02 mm**                                                       |
| Image scale       | **59.749 µrad/pixel**                                                      |
| Spectral range    | **380 – 1050 nm**                                                          |
| Number of filters | **18 (across two filter wheels)**                                          |
| PSF FWHM          | **1.8 pixels**                                                             |

---

### 1.5 VIMS — Wavelength Ranges

| Channel                 | Verified Wavelength Range |
| ----------------------- | ------------------------- |
| VIMS-Visual (VIMS-V)    | **0.35 – 1.05 µm**        |
| VIMS-Infrared (VIMS-IR) | **0.85 – 5.1 µm**         |

---

## 2. Telecommunications & Relay Specifications

### 2.1 Huygens Probe — S-Band Relay Link

| Parameter                            | Verified Value                                                  |
| ------------------------------------ | --------------------------------------------------------------- |
| Link band                            | **S-band**                                                      |
| Channel A carrier frequency          | **2040 MHz**                                                    |
| Channel B carrier frequency          | **2098 MHz**                                                    |
| Relay bit rate (per channel)         | **8,192 bps**                                                   |
| Modulation index                     | **1.34 radians**                                                |
| Number of relay channels             | **2 (Chain A and Chain B)**                                     |
| Temporal offset between chains       | **~6 seconds** _(diversity against brief transmission outages)_ |
| Probe antenna gain (on-boresight)    | **+5 dBi at 2040 MHz; +3 dBi at 2098 MHz**                      |
| Gain variation at ~60° off boresight | **3 dB peak-to-peak**                                           |
| HGA pointing loss (relay ops)        | **≤ 0.5 dB**                                                    |
| End-to-end frame error rate (design) | **10⁻⁵**                                                        |

---

### 2.2 Huygens Doppler Anomaly & Mission Redesign

| Event               | Detail                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Anomaly discovered  | **February 2000** — in-flight test showed the bit synchronizer could not handle the predicted Doppler shift |
| Root cause          | **Hardware limitation** — receiver bandwidth too narrow for probe-orbiter relative velocity                 |
| Resolution          | **New trajectory profiles** (probe-orbiter distance and HGA boresight angle) approved **June 2001**         |
| Channel A data loss | **Receiver never commanded on** — command omitted from ESA sequence                                         |

---

## 3. Astrodynamics & Thermodynamics — Entry Temperatures

### 3.1 Huygens Probe — Titan Atmospheric Entry

| Parameter                                          | Verified Value                                              |
| -------------------------------------------------- | ----------------------------------------------------------- |
| Shock layer (compressed gas) peak temperature      | XXX                                                         |
| AQ60 ablative heat shield peak surface temperature | XXX                                                         |
| Heat shield material                               | **AQ60 — silica fibre felt reinforced with phenolic resin** |
| Front shield geometry                              | **60° half-angle coni-spherical**                           |
| Front shield diameter                              | **2.7 m**                                                   |
| Front shield mass                                  | **~79 kg**                                                  |

---

### 3.2 Cassini Orbiter — Grand Finale Entry Thermal Properties

| Component / Material                        | Parameter                     | Verified Value |
| ------------------------------------------- | ----------------------------- | -------------- |
| Multi-Layer Insulation — Mylar layers       | Melt temperature              | XXX            |
| Multi-Layer Insulation — Kapton outer layer | Char/decomposition onset      | XXX            |
| 7075-T6 Aluminum bus structure              | 50% strength loss temperature | XXX            |
| 7075-T6 Aluminum bus structure              | Liquidus (melt) range         | XXX            |

---

## Reference Sources

| Document / Source                      | URL or Reference                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| CASSINI_ISS_Camera_specs.md            | _(uploaded source)_                                                                                                   |
| CASSINI_VIMS.md                        | _(uploaded source)_                                                                                                   |
| Huygens_telemetry.md                   | _(uploaded source)_                                                                                                   |
| NASA VIMS page                         | https://science.nasa.gov/mission/cassini/spacecraft/cassini-orbiter/visible-and-infrared-mapping-spectrometer/        |
| NASA CIRS page                         | https://solarsystem.nasa.gov/missions/cassini-hds/mission/spacecraft/cassini-orbiter/composite-infrared-spectrometer/ |
| NASA RADAR page                        | https://solarsystem.nasa.gov/missions/cassini-hds/mission/spacecraft/cassini-orbiter/radio-detection-and-ranging/     |
| NASA INMS page                         | https://science.nasa.gov/mission/cassini/spacecraft/cassini-orbiter/ion-and-neutral-mass-spectrometer/                |
| NASA RPWS page                         | https://science.nasa.gov/mission/cassini/spacecraft/cassini-orbiter/radio-and-plasma-wave-science/                    |
| ISS Final Mission Report (PDS)         | https://ciclops.org/media/sp/2018/8686_20620_0.pdf                                                                    |
| ISS Instrument Catalog (JPL/PDS)       | https://pds-imaging.jpl.nasa.gov/data/cassini/cassini_orbiter/coiss_2101/catalog/issna_inst.cat                       |
| Porco et al. 2004 — ISS Science Review | https://link.springer.com/article/10.1007/s11214-004-1456-7                                                           |
| ESA "Hot Shield" — Huygens thermals    | https://sci.esa.int/web/cassini-huygens/-/18405-hot-shield                                                            |
| Huygens (spacecraft) — Wikipedia       | https://en.wikipedia.org/wiki/Huygens_(spacecraft)                                                                    |
| Huygens relay anomaly — _Nature_ News  | https://www.nature.com/news/2005/050117/full/news050117-12.html                                                       |
| JPL DESCANSO Telecom Summary           | https://descanso.jpl.nasa.gov/DPSummary/Descanso3--Cassini2.pdf                                                       |
