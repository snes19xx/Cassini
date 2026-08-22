import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [
    react(),

    // Needed for shader strings in the scene lib
    // include needs @rollup/pluginutils on vite 5, or it filters nothing
    glsl({
      include: ["**/*.glsl", "**/*.vert", "**/*.frag"],
      warnDuplicatedImports: true,
      defaultExtension: "glsl",
      compress: false, // keeps GLSL line numbers accurate
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        // three barely changes, keep it out of the app chunk
        manualChunks: {
          "three-vendor": ["three"],
          "r3f-vendor": [
            "@react-three/fiber",
            "@react-three/drei",
            "@react-three/postprocessing",
            "postprocessing",
          ],
        },
      },
    },
  },

  server: {
    port: 5173,
    open: true,
  },
});
