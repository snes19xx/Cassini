import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";

import { assetUrl } from "@/lib/assetUrl";
import "@/styles/global.css";
import "@/styles/tokens.css";

import App from "./App";

// Asset paths are written from the site root.
THREE.DefaultLoadingManager.setURLModifier(assetUrl);

const root = document.getElementById("root");

if (!root) {
  throw new Error(
    "[cassini] Could not find #root element. " +
      'Check that index.html contains <div id="root">.',
  );
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
