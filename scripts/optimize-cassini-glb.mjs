// scripts/optimize-cassini-glb.mjs

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, textureCompress } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptEncoder } from "meshoptimizer";
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

await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    // sources ship Draco-compressed
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "meshopt.encoder": MeshoptEncoder,
  });

for (const file of MODELS) {
  const from = join(SRC, file);
  const to = join(OUT, file);
  const doc = await io.read(from);
  // left in place, the writer re-encodes Draco
  doc
    .getRoot()
    .listExtensionsUsed()
    .find((ext) => ext.extensionName === "KHR_draco_mesh_compression")
    ?.dispose();

  await doc.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      formats: /image\/png/,
      quality: QUALITY,
      effort: 6,
    }),
    meshopt({
      encoder: MeshoptEncoder,
      level: "high",
      quantizePosition: QUANTIZE_POSITION,
      quantizeTexcoord: 12,
    }),
  );

  await io.write(to, doc);
  const [before, after] = await Promise.all([stat(from), stat(to)]);
  console.log(
    `${file.padEnd(34)} ${kb(before.size).padStart(9)} -> ${kb(after.size).padStart(8)}` +
      `  (${((after.size / before.size - 1) * 100).toFixed(1)}%)`,
  );
}
