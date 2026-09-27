// scripts/optimize-cassini-glb.mjs

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune, textureCompress } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptEncoder } from "meshoptimizer";
import { stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "ASSETS");
const OUT = join(__dirname, "..", "public", "assets");

const MODELS = [
  { file: "CassiniHuygensA.glb", geo: true },
  { file: "CassiniHuygensAwithoutHyugens.glb", geo: true },
  { file: "CassiniHuygensAwithout_Cassini.glb", geo: false },
];

const QUALITY = 90;
const QUANTIZE_POSITION = 16;

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

function dropExtension(doc, name) {
  doc
    .getRoot()
    .listExtensionsUsed()
    .find((ext) => ext.extensionName === name)
    ?.dispose();
}

async function report(from, to) {
  const [before, after] = await Promise.all([stat(from), stat(to)]);
  console.log(
    `${basename(to).padEnd(38)} ${kb(before.size).padStart(9)} -> ${kb(after.size).padStart(8)}` +
      `  (${((after.size / before.size - 1) * 100).toFixed(1)}%)`,
  );
}

await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    // sources ship Draco-compressed
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "meshopt.encoder": MeshoptEncoder,
  });

for (const { file, geo } of MODELS) {
  const from = join(SRC, file);
  const to = join(OUT, file);
  const doc = await io.read(from);
  dropExtension(doc, "KHR_draco_mesh_compression");

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
  await report(from, to);
  if (!geo) continue;

  const geoTo = to.replace(/\.glb$/, "_geo.glb");
  doc.getRoot().listTextures().forEach((tex) => tex.dispose());
  dropExtension(doc, "EXT_texture_webp");
  await doc.transform(prune());
  await io.write(geoTo, doc);
  await report(from, geoTo);
}
