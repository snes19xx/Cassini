// scripts/bakeRingTexture.mjs
import { createCanvas } from "canvas";
import { writeFileSync } from "fs";

const BASE = "https://bjj.mmedia.is/data/s_rings/"; // credits: Björn Jónsson

async function fetchProfile(filename) {
  const res = await fetch(BASE + filename);
  const text = await res.text();
  return text.trim().split(/\s+/).map(Number);
}

const WIDTH = 1024;

async function main() {
  console.log("Fetching ring profiles...");
  const [backscattered, transparency, colorData] = await Promise.all([
    fetchProfile("backscattered.txt"),
    fetchProfile("transparency.txt"),
    fetchProfile("color.txt"), // triplets: R G B R G B ...
  ]);

  const canvas = createCanvas(WIDTH, 4);
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(WIDTH, 4);
  const data = imageData.data;

  for (let x = 0; x < WIDTH; x++) {
    // Map x (0..WIDTH-1) --> index in the 13177-value arrays
    const srcIdx = Math.floor((x / (WIDTH - 1)) * (backscattered.length - 1));

    const bsc = backscattered[srcIdx]; // 0–1
    const trans = transparency[srcIdx]; // 0=opaque, 1=transparent
    const r = colorData[srcIdx * 3 + 0] ?? 1;
    const g = colorData[srcIdx * 3 + 1] ?? 1;
    const b = colorData[srcIdx * 3 + 2] ?? 1;

    // Row 0: backscattered brightness (grayscale stored in R)
    data[(0 * WIDTH + x) * 4 + 0] = Math.round(bsc * 255);
    data[(0 * WIDTH + x) * 4 + 1] = Math.round(bsc * 255);
    data[(0 * WIDTH + x) * 4 + 2] = Math.round(bsc * 255);
    data[(0 * WIDTH + x) * 4 + 3] = 255;

    // Row 1: transparency (white = transparent, for alpha channel use)
    data[(1 * WIDTH + x) * 4 + 0] = Math.round(trans * 255);
    data[(1 * WIDTH + x) * 4 + 1] = Math.round(trans * 255);
    data[(1 * WIDTH + x) * 4 + 2] = Math.round(trans * 255);
    data[(1 * WIDTH + x) * 4 + 3] = 255;

    // Row 2: Cassini color tint
    data[(2 * WIDTH + x) * 4 + 0] = Math.round(r * 255);
    data[(2 * WIDTH + x) * 4 + 1] = Math.round(g * 255);
    data[(2 * WIDTH + x) * 4 + 2] = Math.round(b * 255);
    data[(2 * WIDTH + x) * 4 + 3] = 255;

    // Row 3: composite RGBA -- backscattered × color, alpha = 1 - transparency
    data[(3 * WIDTH + x) * 4 + 0] = Math.round(bsc * r * 255);
    data[(3 * WIDTH + x) * 4 + 1] = Math.round(bsc * g * 255);
    data[(3 * WIDTH + x) * 4 + 2] = Math.round(bsc * b * 255);
    data[(3 * WIDTH + x) * 4 + 3] = Math.round((1 - trans) * 255); // opacity from density
  }

  ctx.putImageData(imageData, 0, 0);
  // Save row 3 as a standalone ring strip for Three.js
  const finalCanvas = createCanvas(WIDTH, 1);
  const fctx = finalCanvas.getContext("2d");
  fctx.drawImage(canvas, 0, 3, WIDTH, 1, 0, 0, WIDTH, 1);

  const buf = finalCanvas.toBuffer("image/png");
  writeFileSync("public/textures/saturn_rings.png", buf);
  console.log("Done → public/textures/saturn_rings.png");
}

main();
