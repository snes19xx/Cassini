import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/styles/tokens.css";
import "@/styles/global.css";

import App from "./App";

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
