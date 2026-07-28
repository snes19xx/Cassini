// scripts/optimize-textures.mjs
//
// Builds the placeholder and optimized WebP tiers from
// /ASSETS/textures/originals. Output basenames must match
// src/scenes/cassini/lib/textureService.ts exactly.
//
// node scripts/optimize-textures.mjs

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "ASSETS", "textures", "originals");
const OUT_PLACEHOLDER = join(__dirname, "..", "public", "textures", "placeholders");
const OUT_OPTIMIZED = join(__dirname, "..", "public", "textures", "optimized");

// Saturn stays 4K; it fills the screen during saturn_arrival.
const MOON_OPT_WIDTH = 2048;
const SATURN_OPT_WIDTH = 4096;
const PLACEHOLDER_WIDTH = 512;
const OPT_QUALITY = 88; // 92 was producing 8 MB+ files; 88 drops to ~1.5 MB.
const PLACEHOLDER_QUALITY = 78;

/**
 * Each entry maps a source file in /originals to its placeholder + optimized
 * outputs. `phName` and `optName` use the exact runtime-expected basenames.
 */
const TEX_SOURCES = [
  // Moons
  { src: "iapetus.jpg",              phName: "iapetus_ph.webp",              optName: "iapetus_opt.webp" },
  { src: "enceladus.jpg",            phName: "enceladus_ph.webp",            optName: "enceladus_opt.webp" },
  { src: "enceladus_IR.jpg",         phName: "enceladus_IR_ph.webp",         optName: "enceladus_IR_opt.webp" },
  { src: "mimas.jpg",                phName: "mimas_ph.webp",                optName: "mimas_opt.webp" },
  { src: "rhea.jpg",                 phName: "rhea_ph.webp",                 optName: "rhea_opt.webp" },
  { src: "dione.jpg",                phName: "dione_ph.webp",                optName: "dione_opt.webp" },
  { src: "tethys.jpg",               phName: "tethys_ph.webp",               optName: "tethys_opt.webp" },
  // Titan spectral variants
  { src: "titan_visible.png",        phName: "titan_visible_ph.webp",        optName: "titan_visible__opt.webp" },
  { src: "titan_IR.png",             phName: "titan_ir.webp",                optName: "titan_IR_opt.webp" },
  { src: "titan_false_color_IR.jpg", phName: "titan_false_color_IR_ph.webp", optName: "titan_false_color_IR_opt.webp" },
  { src: "titan_near_IR.jpg",        phName: "titan_near_IR_ph.webp",        optName: "titan_near_IR_opt.webp" },
  // Saturn
  { src: "saturn.jpg",               phName: "saturn_ph.webp",               optName: "saturn_opt.webp" },
];

await mkdir(OUT_PLACEHOLDER, { recursive: true });
await mkdir(OUT_OPTIMIZED, { recursive: true });

let totalIn = 0;
let totalPlaceholder = 0;
let totalOptimized = 0;

for (const j of TEX_SOURCES) {
  const srcPath = join(SRC, j.src);
  const placeholderPath = join(OUT_PLACEHOLDER, j.phName);
  const optimizedPath = join(OUT_OPTIMIZED, j.optName);
  try {
    const inStat = await stat(srcPath);
    const isSaturn = j.src === "saturn.jpg";
    const optWidth = isSaturn ? SATURN_OPT_WIDTH : MOON_OPT_WIDTH;

    await sharp(srcPath)
      .resize({ width: PLACEHOLDER_WIDTH, withoutEnlargement: true })
      .webp({ quality: PLACEHOLDER_QUALITY, effort: 6 })
      .toFile(placeholderPath);

    await sharp(srcPath)
      .resize({ width: optWidth, withoutEnlargement: true })
      .webp({ quality: OPT_QUALITY, effort: 6 })
      .toFile(optimizedPath);

    const phStat = await stat(placeholderPath);
    const opStat = await stat(optimizedPath);
    totalIn += inStat.size;
    totalPlaceholder += phStat.size;
    totalOptimized += opStat.size;

    const inMB = (inStat.size / 1024 / 1024).toFixed(2);
    const phKB = (phStat.size / 1024).toFixed(0);
    const opMB = (opStat.size / 1024 / 1024).toFixed(2);
    console.log(
      `${j.src.padEnd(28)} src ${inMB.padStart(6)} MB  ph ${phKB.padStart(4)} KB  opt ${opMB.padStart(5)} MB`,
    );
  } catch (err) {
    console.warn(`SKIP ${j.src}: ${err.message}`);
  }
}

console.log(
  `\nTOTAL  src ${(totalIn / 1024 / 1024).toFixed(2)} MB  ` +
    `placeholders ${(totalPlaceholder / 1024).toFixed(0)} KB  ` +
    `optimized ${(totalOptimized / 1024 / 1024).toFixed(2)} MB`,
);
