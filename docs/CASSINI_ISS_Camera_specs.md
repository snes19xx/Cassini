The Cassini Imaging Science Subsystem (ISS) consists of two fixed focal length telescopes—the Narrow Angle Camera (NAC) and the Wide Angle Camera (WAC). They share several core components but possess distinct optical designs and parameters.

**General ISS Camera Parameters**

- **CPU:** IBM MIL-STD-1750A 16-bit processor.
- **Detector:** A three-phase, front-side illuminated Charge-Coupled Device (CCD) detector with a **1024 × 1024 pixel format**, where each pixel is 12 µm on a side.
- **Exposure:** 64 commandable settings ranging from **5 milliseconds to 1200 seconds**, with a minimum framing time of 11 seconds.
- **Signal and Data:** 12-bit signal digitization (4095 DN) that supports both lossless and lossy data compression.
- **Summation modes:** Options for 1 × 1, 2 × 2, and 4 × 4 on-chip summing.
- **Read noise level:** 12 electrons in the high gain state.

**Field-of-View (FOV) and Optical Design Parameters for the NAC and WAC**
Extracting directly from the optical design and instrument characteristics sections, the specific FOV limits and optical parameters are as follows:

**Narrow Angle Camera (NAC)**

- **Field of View:** The NAC has a **square FOV of 0.35° × 0.35°**, which is precisely **6.134 mrad**.
- **Optical Design:** It is an _f_/10.5 Ritchey-Chretien reflecting telescope with a focal length of 2002.70 ± 0.07 mm.
- **Image Scale:** 5.9907 µrad/pixel.
- **Spectral Range:** 200 to 1050 nm (spanning the near-UV to near-IR), utilizing 24 filters across two filter wheels.
- **Point Spread Function (FWHM):** 1.3 pixels.

**Wide Angle Camera (WAC)**

- **Field of View:** The WAC has a **square FOV of 3.5° × 3.5°**, which is precisely **61.18 mrad**.
- **Optical Design:** It is an _f_/3.5 color-corrected refractor (utilizing a Voyager flight spare optical train) with a focal length of 200.77 ± 0.02 mm.
- **Image Scale:** 59.749 µrad/pixel.
- **Spectral Range:** 380 to 1050 nm, utilizing 18 filters across two filter wheels (the refractor design limits the lower end of the spectral range, sacrificing the near-UV response).
- **Point Spread Function (FWHM):** 1.8 pixels.
