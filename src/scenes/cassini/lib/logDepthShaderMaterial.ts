// Without the logdepthbuf_* chunks, a ShaderMaterial on a
// logarithmicDepthBuffer renderer writes garbage depth (rings drew through
// Saturn before this existed). Assumes a single main(); vertex chunk goes
// right before the last `}`, fragment chunk right after main()'s opening
// `{`. Already-patched sources pass through untouched.

import * as THREE from "three";

function injectVertex(src: string): string {
  if (src.includes("logdepthbuf")) return src;
  const lastBrace = src.lastIndexOf("}");
  if (lastBrace === -1) return src;
  return (
    "#include <common>\n#include <logdepthbuf_pars_vertex>\n" +
    src.slice(0, lastBrace) +
    "  #include <logdepthbuf_vertex>\n" +
    src.slice(lastBrace)
  );
}

function injectFragment(src: string): string {
  if (src.includes("logdepthbuf")) return src;
  const mainIdx = src.search(/void\s+main\s*\(\s*\)\s*\{/);
  if (mainIdx === -1) return src;
  const braceIdx = src.indexOf("{", mainIdx);
  return (
    "#include <common>\n#include <logdepthbuf_pars_fragment>\n" +
    src.slice(0, braceIdx + 1) +
    "\n  #include <logdepthbuf_fragment>" +
    src.slice(braceIdx + 1)
  );
}

export function makeLogDepthShaderMaterial(
  params: THREE.ShaderMaterialParameters & {
    vertexShader: string;
    fragmentShader: string;
  },
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    ...params,
    vertexShader: injectVertex(params.vertexShader),
    fragmentShader: injectFragment(params.fragmentShader),
  });
}
