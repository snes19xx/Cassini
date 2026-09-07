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
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        // three barely changes, keep it out of the app chunk
        // rolldown replaced manualChunks with groups, first match wins
        codeSplitting: {
          groups: [
            { name: "three-vendor", test: /node_modules[\\/]three[\\/]/ },
            {
              name: "r3f-vendor",
              test: /node_modules[\\/](@react-three[\\/]|postprocessing[\\/])/,
            },
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
