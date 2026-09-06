import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { quantize, simplify, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "ASSETS");
const OUT = join(__dirname, "..", "public", "assets");

const MODELS = [
  { file: "JANUS.glb", ratio: 0.08 },
  { file: "PANDORA.glb", ratio: 0.03 },
];

const ERROR = 0.008;

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const { file, ratio } of MODELS) {
  const from = join(SRC, file);
  const to = join(OUT, file);
  const doc = await io.read(from);

  let srcVerts = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      srcVerts += prim.getAttribute("POSITION").getCount();
      prim.setAttribute("NORMAL", null);
    }
  }

  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: ERROR }),
    quantize(),
  );

  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      tris += (idx ?? prim.getAttribute("POSITION")).getCount() / 3;
    }
  }

  await io.write(to, doc);
  const [before, after] = await Promise.all([stat(from), stat(to)]);
  const cut = (1 - after.size / before.size) * 100;
  console.log(
    `${file.padEnd(12)} ${kb(before.size).padStart(8)} -> ${kb(after.size).padStart(7)}` +
      `  (-${cut.toFixed(1)}%)  ${srcVerts / 3} tris -> ${tris}`,
  );
}
