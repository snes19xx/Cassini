import { describe, expect, it } from "vitest";
import { makeLogDepthShaderMaterial } from "./logDepthShaderMaterial";

const PLAIN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PLAIN_FRAG = `
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(vUv, 0.0, 1.0);
}
`;

const INSTRUMENTED_VERT = `
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`;

const INSTRUMENTED_FRAG = `
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  gl_FragColor = vec4(1.0);
}
`;

describe("makeLogDepthShaderMaterial", () => {
  it("injects all four chunks into plain sources, in the required order", () => {
    const mat = makeLogDepthShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: PLAIN_FRAG,
    });

    const v = mat.vertexShader;
    expect(v.indexOf("#include <common>")).toBe(0);
    expect(v).toContain("#include <logdepthbuf_pars_vertex>");
    // Vertex chunk must sit after gl_Position is set.
    const glPos = v.indexOf("gl_Position");
    const vChunk = v.indexOf("#include <logdepthbuf_vertex>");
    expect(vChunk).toBeGreaterThan(glPos);
    expect(vChunk).toBeLessThan(v.lastIndexOf("}"));

    const f = mat.fragmentShader;
    expect(f.indexOf("#include <common>")).toBe(0);
    expect(f).toContain("#include <logdepthbuf_pars_fragment>");
    // Fragment chunk must be main's first statement.
    const mainBrace = f.indexOf("{", f.search(/void\s+main/));
    const fChunk = f.indexOf("#include <logdepthbuf_fragment>");
    expect(fChunk).toBeGreaterThan(mainBrace);
    expect(f.slice(mainBrace + 1, fChunk).trim()).toBe("");
  });

  it("passes already-instrumented sources through byte-identical", () => {
    const mat = makeLogDepthShaderMaterial({
      vertexShader: INSTRUMENTED_VERT,
      fragmentShader: INSTRUMENTED_FRAG,
    });
    expect(mat.vertexShader).toBe(INSTRUMENTED_VERT);
    expect(mat.fragmentShader).toBe(INSTRUMENTED_FRAG);
  });

  it("forwards ShaderMaterial params untouched", () => {
    const mat = makeLogDepthShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: PLAIN_FRAG,
      transparent: true,
      uniforms: { uThing: { value: 3 } },
    });
    expect(mat.transparent).toBe(true);
    expect(mat.uniforms.uThing!.value).toBe(3);
  });
});
