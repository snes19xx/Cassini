// scripts/optimize-cassini-glb.mjs

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { draco, textureCompress } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "ASSETS");
const OUT = join(__dirname, "..", "public", "assets");

const MODELS = [
  "CassiniHuygensA.glb",
  "CassiniHuygensAwithoutHyugens.glb",
  "CassiniHuygensAwithout_Cassini.glb",
];

const QUALITY = 90;
const QUANTIZE_POSITION = 16;

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });

for (const file of MODELS) {
  const from = join(SRC, file);
  const to = join(OUT, file);
  const doc = await io.read(from);

  await doc.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      formats: /image\/png/,
      quality: QUALITY,
      effort: 6,
    }),
    draco({
      quantizePosition: QUANTIZE_POSITION,
      quantizeNormal: 10,
      quantizeTexcoord: 12,
    }),
  );

  await io.write(to, doc);
  const [before, after] = await Promise.all([stat(from), stat(to)]);
  console.log(
    `${file.padEnd(34)} ${kb(before.size).padStart(9)} -> ${kb(after.size).padStart(8)}` +
      `  (-${((1 - after.size / before.size) * 100).toFixed(1)}%)`,
  );
}
