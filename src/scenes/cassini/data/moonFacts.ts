// src/scenes/cassini/data/moonFacts.ts
//
// Panel copy for each labelled moon, keyed by the same bodyId the labels use.

export interface MoonFact {
  /** Matches tableau.moons[].body and the BODY_LABELS bodyId set. */
  id: string;
  name: string;
  paragraphs: string[];
}

export const MOON_FACTS: Record<string, MoonFact> = {
  janus: {
    id: "janus",
    name: "JANUS",
    paragraphs: [
      "Janus has a mean radius of roughly 89 km and a mean density of only " +
        "0.63 g/cm3, which is significantly less dense than water ice. This " +
        "low density indicates that the moon is not a solid block of rock or " +
        "ice, but rather an accumulation of loosely aggregated fragments " +
        "with substantial internal void space, likely formed after a parent " +
        "body was shattered by an impact.",
    ],
  },

  pandora: {
    id: "pandora",
    name: "PANDORA",
    paragraphs: [
      "Pandora is about 25.3 miles (40.7 kilometers) in mean radius. It " +
        "orbits 88,000 miles (142,000 kilometers) away from Saturn, near the " +
        "F ring, taking 15.1 hours to go around Saturn. It is coated in a " +
        "fine (dust-sized) icy material. Even the craters on Pandora are " +
        "coated in debris.",
    ],
  },

  enceladus: {
    id: "enceladus",
    name: "ENCELADUS",
    paragraphs: [
      "It is the most reflective object in the solar system. Enceladus has a " +
        "geometric albedo exceeding 99%, reflecting almost all the sunlight " +
        "that strikes its surface.",
      "It single-handedly manufactures Saturn's E ring. Saturn's vast, " +
        "diffuse E ring stretches across roughly one million kilometers of " +
        "space, and Enceladus orbits dead-center in its densest zone. About " +
        "90% of the ice crystals and micron-sized particles vented into " +
        "space escape the moon's weak gravity and enter Saturn's orbit, " +
        "continuously replenishing and maintaining the entire E ring " +
        "structure.",
    ],
  },

  mimas: {
    id: "mimas",
    name: "MIMAS",
    paragraphs: [
      "Mimas's Herschel impact nearly obliterated the moon. It spans roughly " +
        "130 km across, covering nearly one-third of Mimas's total 396 km " +
        "diameter. Its outer walls rise 5 km high, and its central mountain " +
        "peak towers 6 km above the crater floor. The original impact sent " +
        "immense shockwaves through the interior that fractured the crust on " +
        "the exact opposite hemisphere, coming dangerously close to " +
        "pulverizing the entire body.",
    ],
  },

  rhea: {
    id: "rhea",
    name: "RHEA",
    paragraphs: [
      "Rhea is Saturn's second largest moon. It holds a tenuous, " +
        "oxygen-rich atmosphere sustained by radiation. Unlike Earth's " +
        "biologically generated oxygen, Rhea's atmosphere forms when " +
        "energetic charged particles trapped in Saturn's magnetosphere " +
        "bombard surface water ice, radiolytically splitting H2O molecules " +
        "into oxygen and hydrogen gas. The lighter hydrogen escapes into " +
        "space, leaving behind a persistent oxygen envelope held by the " +
        "moon's gravity.",
    ],
  },

  iapetus: {
    id: "iapetus",
    name: "IAPETUS",
    paragraphs: [
      "Iapetus is the only major moon with a direct, unhindered view of Saturn's " +
        "rings. Most of Saturn's large moons orbit directly within the " +
        "planet's equatorial plane; the rings appear only as a " +
        "razor-thin, nearly invisible line from their surfaces. Because " +
        "It sits at an unusually high orbital inclination of roughly 15 " +
        "degrees and orbits from a great distance (over 3.5 million " +
        "kilometers away), an observer on its surface would look down on the " +
        "broad face of the rings in full perspective.",
    ],
  },

  tethys: {
    id: "tethys",
    name: "TETHYS",
    paragraphs: [
      "Tethys is marked by mysterious, geologically fresh red streaks. " +
        "High-resolution color imaging from Cassini revealed narrow, curving " +
        "reddish arcs etched across its surface that cut cleanly across " +
        "older craters and rifts. Because these features ignore existing " +
        "terrain, scientists believe they are geologically young and could " +
        "be caused by chemical impurities outgassing along shallow fractures " +
        "or the remnants of a shattered, iron-rich cometary body crashing " +
        "across the surface.",
    ],
  },

  dione: {
    id: "dione",
    name: "DIONE",
    paragraphs: [
      "A heavily cratered icy moon with bright tectonic fractures cutting " +
        "across its trailing hemisphere. Dione's crater pattern is oddly " +
        "reversed for a tidally locked world: its trailing side is more " +
        "heavily cratered than its leading side, possibly the aftermath of a " +
        "massive impact that reoriented the moon before Saturn's gravity " +
        "locked it in place again.",
    ],
  },

  titan: {
    id: "titan",
    name: "TITAN",
    paragraphs: [
      "Titan's atmospheric drag physically shifts Titan's outer crust over a " +
        "hidden subsurface ocean. When Cassini tracked surface landmarks " +
        "over several years, features had drifted up to 30 kilometers away " +
        "from their expected positions based on the moon's spin. Titan's " +
        "dense, rapidly circulating atmosphere exerts massive aerodynamic " +
        "friction on the surface. Because a global liquid water ocean " +
        "separates the icy crust from the rocky core, the shell is " +
        "mechanically decoupled. The atmosphere acts like a planetary-scale " +
        "brake and accelerator, dragging the entire outer ice shell out of " +
        "sync with the interior.",
    ],
  },
};
