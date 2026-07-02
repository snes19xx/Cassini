/// <reference types="vite/client" />

// vite-plugin-glsl turns these into raw strings at build time
declare module "*.vert" {
  const src: string;
  export default src;
}
declare module "*.frag" {
  const src: string;
  export default src;
}
declare module "*.glsl" {
  const src: string;
  export default src;
}
