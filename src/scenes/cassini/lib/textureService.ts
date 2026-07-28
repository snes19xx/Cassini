// src/scenes/cassini/lib/textureService.ts
//
// Moon texture lifecycle service. Tracks which texture, placeholder or
// optimized, each moon is currently bound to.
//
// Responsibilities per new_plan.md §9:
//   1. Tier 1 placeholders (~50 KB each) load at app start; never disposed.
//   2. Tier 2 optimized (~33 MB VRAM each) promotes when scrub is within
//      PROMOTE_LEAD_T of a moon's window, and at most ONE is resident.
//   3. Eviction handshake (rendering.md §4): rebind placeholder, dispose
//      optimized, delete cache entry. In that order, atomically.
//   4. AbortController on optimized fetches so a JUMP-TO mid-load cancels
//      the wasted bytes.
//   5. JUMP-TO never blocks: placeholder renders immediately, optimized
//      swaps in when ready.
//   6. BLUEPRINT toggle purges all optimized textures (debounced 250 ms to
//      absorb rapid mode flipping).
//   7. Saturn's texture is NOT managed here, it's always-resident in
//      SaturnBody.tsx. Saturn never needs eviction.
//
// Consumer API:
//   - subscribe(body, fn): listen for binding changes
//   - getBinding(body): current { texture, tier }
//
// Driver responsibility (TextureServiceDriver.tsx):
//   - call initialize() on canvas mount
//   - call tick(currentT, mode, ...) every frame
//   - call setBlueprintMode(...) when renderMode toggles
//   - call setTitanMode(...) when titanSpectralMode changes

import * as THREE from "three";
import { TABLEAUS, getActiveTableau } from "../data/tableaus";

export type MoonId =
  | "titan"
  | "iapetus"
  | "enceladus"
  | "mimas"
  | "tethys"
  | "dione"
  | "rhea";

export const ALL_MOONS: MoonId[] = [
  "titan",
  "iapetus",
  "enceladus",
  "mimas",
  "tethys",
  "dione",
  "rhea",
];

// Tunables
//
// PROMOTE_LEAD_T: how far ahead of a moon's window to start fetching its
// optimized texture during cruise/saturn-focus. 0.04 is about 7s at 1x
// playback (180s journey), about 0.7s at 10x.
//
// NOTE: There is intentionally NO grace window after `tEnd`. Originally
// we had one, but it caused a bug: at t=0.490 (JUMP-TO IAPETUS) the
// grace on Enceladus's window made `activeHiresOwner` return enceladus
// because it iterated tableaus in order and matched Enceladus first. The
// active tableau is now the authoritative owner; eviction happens
// immediately when the user crosses into the next moon's window.

const PROMOTE_LEAD_T = 0.04;
const BLUEPRINT_PURGE_DELAY_MS = 250;

// Asset paths

// Per-body default texture paths. For Titan and Enceladus these are the
// "visible" mode entries; spectral switches consult the per-mode tables
// below.
const PLACEHOLDER_PATH: Record<MoonId, string> = {
  iapetus: "/textures/placeholders/iapetus_ph.webp",
  enceladus: "/textures/placeholders/enceladus_ph.webp",
  mimas: "/textures/placeholders/mimas_ph.webp",
  rhea: "/textures/placeholders/rhea_ph.webp",
  dione: "/textures/placeholders/dione_ph.webp",
  tethys: "/textures/placeholders/tethys_ph.webp",
  titan: "/textures/placeholders/titan_visible_ph.webp",
};

const OPTIMIZED_PATH: Record<MoonId, string> = {
  iapetus: "/textures/optimized/iapetus_opt.webp",
  enceladus: "/textures/optimized/enceladus_opt.webp",
  mimas: "/textures/optimized/mimas_opt.webp",
  rhea: "/textures/optimized/rhea_opt.webp",
  dione: "/textures/optimized/dione_opt.webp",
  tethys: "/textures/optimized/tethys_opt.webp",
  titan: "/textures/optimized/titan_visible__opt.webp",
};

// Titan spectral mode → (placeholder, optimized) paths.
// Modes match TitanSpectralMode in missionStore.ts and the imaging
// definitions in cassini_imaging.md.
//
// NOTE on naming quirks (preserved from the on-disk asset bake):
//   - titan_visible's optimized file has a DOUBLE underscore.
//   - titan_ir's placeholder lacks the _ph suffix (it's titan_ir.webp).
const TITAN_PLACEHOLDER_BY_MODE: Record<string, string> = {
  visible: "/textures/placeholders/titan_visible_ph.webp",
  vims_ir: "/textures/placeholders/titan_ir.webp",
  iss_cb3: "/textures/placeholders/titan_false_color_IR_ph.webp",
  iss_nac_ir: "/textures/placeholders/titan_near_IR_ph.webp",
};
const TITAN_OPTIMIZED_BY_MODE: Record<string, string> = {
  visible: "/textures/optimized/titan_visible__opt.webp",
  vims_ir: "/textures/optimized/titan_IR_opt.webp",
  iss_cb3: "/textures/optimized/titan_false_color_IR_opt.webp",
  iss_nac_ir: "/textures/optimized/titan_near_IR_opt.webp",
};

// Enceladus spectral mode → paths. Only two modes today.
const ENCELADUS_PLACEHOLDER_BY_MODE: Record<string, string> = {
  visible: "/textures/placeholders/enceladus_ph.webp",
  vims_ir: "/textures/placeholders/enceladus_IR_ph.webp",
};
const ENCELADUS_OPTIMIZED_BY_MODE: Record<string, string> = {
  visible: "/textures/optimized/enceladus_opt.webp",
  vims_ir: "/textures/optimized/enceladus_IR_opt.webp",
};

function placeholderPathFor(
  body: MoonId,
  titanMode: string,
  enceladusMode: string,
): string {
  if (body === "titan") {
    return TITAN_PLACEHOLDER_BY_MODE[titanMode] ?? PLACEHOLDER_PATH.titan;
  }
  if (body === "enceladus") {
    return (
      ENCELADUS_PLACEHOLDER_BY_MODE[enceladusMode] ?? PLACEHOLDER_PATH.enceladus
    );
  }
  return PLACEHOLDER_PATH[body];
}

function optimizedPathFor(
  body: MoonId,
  titanMode: string,
  enceladusMode: string,
): string {
  if (body === "titan") {
    return TITAN_OPTIMIZED_BY_MODE[titanMode] ?? OPTIMIZED_PATH.titan;
  }
  if (body === "enceladus") {
    return (
      ENCELADUS_OPTIMIZED_BY_MODE[enceladusMode] ?? OPTIMIZED_PATH.enceladus
    );
  }
  return OPTIMIZED_PATH[body];
}

// State

export type Tier = "none" | "placeholder" | "optimized";

export interface Binding {
  texture: THREE.Texture | null;
  tier: Tier;
}

const NO_BINDING: Binding = { texture: null, tier: "none" };

const placeholders = new Map<MoonId, THREE.Texture>();
// Every spectral-mode placeholder keyed by its URL. Populated once during
// initialize() so the user's first click on a Titan / Enceladus spectral
// button can swap to the new mode's placeholder synchronously: no fetch,
// no decode, no GPU upload at click time.
const placeholdersByUrl = new Map<string, THREE.Texture>();
const optimized = new Map<MoonId, THREE.Texture>();
const fetches = new Map<MoonId, AbortController>();
const bindings = new Map<MoonId, Binding>();
const listeners = new Map<MoonId, Set<() => void>>();

// Deferred disposal queue. We can't dispose a texture in the same tick we
// rebind it to a placeholder: React's effect hasn't committed the new
// material.map yet, so the next frame would render with a disposed GL
// texture handle (GL error → possible context loss → SCENE FAULT). Every
// tick flushes the previous tick's pending disposals.
const pendingDisposals: THREE.Texture[] = [];

let initialized = false;
let isBlueprintMode = false;
let blueprintTimer: ReturnType<typeof setTimeout> | null = null;
let currentTitanMode = "visible";
let currentEnceladusMode = "visible";

function deferDispose(tex: THREE.Texture | null | undefined) {
  if (tex) pendingDisposals.push(tex);
}

function flushDisposals() {
  while (pendingDisposals.length > 0) {
    pendingDisposals.shift()!.dispose();
  }
}

// Subscription API

export function subscribe(body: MoonId, fn: () => void): () => void {
  let set = listeners.get(body);
  if (!set) {
    set = new Set();
    listeners.set(body, set);
  }
  set.add(fn);
  return () => {
    listeners.get(body)?.delete(fn);
  };
}

export function getBinding(body: MoonId): Binding {
  return bindings.get(body) ?? NO_BINDING;
}

function emit(body: MoonId) {
  listeners.get(body)?.forEach((fn) => fn());
}

function setBinding(body: MoonId, next: Binding) {
  bindings.set(body, next);
  emit(body);
}

// Loader

function configureTexture(tex: THREE.Texture, maxAniso: number) {
  // Configure BEFORE the first GPU upload (rendering.md §4.3.1) so mipmaps
  // generate on the first frame the texture is used, not later, after a
  // racy `needsUpdate = true` cycle that produces RGB-stripe artifacts.
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
}

async function loadTexture(
  url: string,
  signal: AbortSignal,
  gl: THREE.WebGLRenderer,
): Promise<THREE.Texture | null> {
  const label = url.split("/").pop() ?? url;
  const t0 = performance.now();
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      console.warn(`[TextureService] HTTP ${res.status} for ${url}`);
      return null;
    }
    const tFetch = performance.now();
    const blob = await res.blob();
    if (signal.aborted) return null;
    const tBlob = performance.now();
    // `imageOrientation: "flipY"` is REQUIRED. three.js r156+ ignores the
    // texture.flipY flag for ImageBitmap-sourced textures (WebGL doesn't
    // honor UNPACK_FLIP_Y_WEBGL on ImageBitmap uploads), so the bitmap
    // ends up in the texture with row 0 at the bottom-left of UV space.
    // For an equirectangular moon map (row 0 = north pole), that means
    // the texture renders upside-down on a SphereGeometry whose UVs put
    // s,t=0,0 at the south pole. createImageBitmap with imageOrientation
    // "flipY" pre-flips the bitmap so row 0 = bottom of image, restoring
    // right-side-up rendering.
    const bitmap = await createImageBitmap(blob, { imageOrientation: "flipY" });
    if (signal.aborted) {
      bitmap.close();
      return null;
    }
    const tDecode = performance.now();
    const tex = new THREE.Texture(bitmap);
    configureTexture(tex, gl.capabilities.getMaxAnisotropy());
    const tConfigure = performance.now();
    // Pre-upload to GPU NOW, outside the render loop, so the first frame
    // that uses this texture doesn't stall on the upload (rendering.md
    // §3, uncompressed 2K texture is ~8 MB, 8K is ~134 MB). When this
    // logs >200 ms the texture is almost certainly oversized.
    try {
      gl.initTexture(tex);
    } catch (err) {
      console.warn(`[TextureService] initTexture failed ${url}`, err);
    }
    const tUpload = performance.now();
    const w = bitmap.width;
    const h = bitmap.height;
    console.log(
      `[TextureService] ${label.padEnd(34)} ${w}×${h}  ` +
        `fetch ${(tFetch - t0).toFixed(0)}ms  ` +
        `blob ${(tBlob - tFetch).toFixed(0)}ms  ` +
        `decode ${(tDecode - tBlob).toFixed(0)}ms  ` +
        `init ${(tConfigure - tDecode).toFixed(0)}ms  ` +
        `upload ${(tUpload - tConfigure).toFixed(0)}ms  ` +
        `total ${(tUpload - t0).toFixed(0)}ms`,
    );
    return tex;
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      console.warn(`[TextureService] load failed ${url}`, err);
    }
    return null;
  }
}

// Lifecycle

/**
 * Load every moon placeholder PLUS every spectral-mode placeholder. All
 * are kept always-resident (one placeholder per asset is ~10 KB WebP →
 * ~60 KB total across the entire 7-moon + 4-titan-mode + 2-enceladus-mode
 * set, well below the always-resident budget). Preloading every spectral
 * variant up front is what makes the user's spectral-button click feel
 * instant: switchSpectralMode() reads from `placeholdersByUrl` synchronously
 * instead of awaiting a fresh fetch.
 */
export async function initialize(gl: THREE.WebGLRenderer) {
  if (initialized) return;
  initialized = true;

  // Collect every placeholder URL we may need across body × spectral-mode.
  const allUrls = new Set<string>();
  for (const body of ALL_MOONS) {
    if (body === "titan") {
      for (const url of Object.values(TITAN_PLACEHOLDER_BY_MODE)) {
        allUrls.add(url);
      }
    } else if (body === "enceladus") {
      for (const url of Object.values(ENCELADUS_PLACEHOLDER_BY_MODE)) {
        allUrls.add(url);
      }
    } else {
      allUrls.add(PLACEHOLDER_PATH[body]);
    }
  }

  await Promise.all(
    Array.from(allUrls).map(async (url) => {
      if (placeholdersByUrl.has(url)) return;
      const ac = new AbortController();
      const tex = await loadTexture(url, ac.signal, gl);
      if (tex) placeholdersByUrl.set(url, tex);
    }),
  );

  // Bind each body to its current-mode placeholder.
  for (const body of ALL_MOONS) {
    const path = placeholderPathFor(
      body,
      currentTitanMode,
      currentEnceladusMode,
    );
    const tex = placeholdersByUrl.get(path);
    if (!tex) continue;
    placeholders.set(body, tex);
    if (bindings.get(body)?.tier !== "optimized") {
      setBinding(body, { texture: tex, tier: "placeholder" });
    }
  }
}

/**
 * Find which moon (if any) should own the single optimized-tier slot at
 * mission time `t`.
 *
 * 1. If the active tableau IS a moon, that body wins. This is the
 *    authoritative case: what the user is looking at right now.
 * 2. Otherwise (cruise / saturn_focus / finale) we may pre-fetch the
 *    NEXT moon if t is within `PROMOTE_LEAD_T` of its tStart.
 *
 * No grace window past tEnd. That caused a bug where the previous
 * moon's grace overlapped the next moon's window, and the in-order
 * iteration matched the wrong body.
 */
function activeHiresOwner(t: number): MoonId | null {
  const active = getActiveTableau(t);
  if (active.kind === "moon" && active.body) {
    return active.body as MoonId;
  }
  for (const tab of TABLEAUS) {
    if (tab.kind !== "moon" || !tab.body) continue;
    if (t >= tab.tStart - PROMOTE_LEAD_T && t < tab.tStart) {
      return tab.body as MoonId;
    }
  }
  return null;
}

/**
 * Eviction handshake: rebind placeholder → DEFER dispose → drop cache.
 * Dispose runs on the next tick, by then React will have committed the
 * placeholder rebind to `material.map`, so we never render a frame with
 * a disposed GL handle.
 */
function evictOptimized(body: MoonId) {
  const tex = optimized.get(body);
  if (!tex) return;
  // 1. Rebind placeholder so the material has SOMETHING for the next frame.
  const ph = placeholders.get(body);
  if (ph) setBinding(body, { texture: ph, tier: "placeholder" });
  else setBinding(body, NO_BINDING);
  // 2. Queue dispose for next tick (after React commits the new binding).
  deferDispose(tex);
  // 3. Clear cache entry.
  optimized.delete(body);
}

/** Cancel an in-flight optimized fetch for `body`. */
function cancelFetch(body: MoonId) {
  const ac = fetches.get(body);
  if (ac) {
    ac.abort();
    fetches.delete(body);
  }
}

async function promoteOptimized(body: MoonId, gl: THREE.WebGLRenderer) {
  if (optimized.has(body) || fetches.has(body)) return;
  const ac = new AbortController();
  fetches.set(body, ac);
  const path = optimizedPathFor(body, currentTitanMode, currentEnceladusMode);
  const tex = await loadTexture(path, ac.signal, gl);
  // We're back: was our fetch aborted, or did we lose ownership?
  if (ac.signal.aborted) {
    deferDispose(tex);
    return;
  }
  fetches.delete(body);
  if (!tex) return;
  // Final guard: blueprint mode may have flipped while we were loading.
  if (isBlueprintMode) {
    deferDispose(tex);
    return;
  }
  optimized.set(body, tex);
  setBinding(body, { texture: tex, tier: "optimized" });
}

/**
 * Frame tick. Run from a useFrame in TextureServiceDriver.
 * Reconciles state: at most one optimized resident; that one is for the
 * moon the user is currently looking at (or imminent next on cruise).
 */
export function tick(t: number, gl: THREE.WebGLRenderer) {
  if (!initialized) return;
  // Always flush prior-tick disposals first: React has committed by now.
  flushDisposals();
  if (isBlueprintMode) return;

  const owner = activeHiresOwner(t);

  // Evict any optimized that isn't the current owner.
  for (const body of Array.from(optimized.keys())) {
    if (body !== owner) evictOptimized(body);
  }

  // Abort any fetch that isn't for the current owner.
  for (const body of Array.from(fetches.keys())) {
    if (body !== owner) cancelFetch(body);
  }

  // Promote the owner if it isn't already resident or in-flight.
  if (owner && !optimized.has(owner) && !fetches.has(owner)) {
    void promoteOptimized(owner, gl);
  }
}

// BLUEPRINT debounced purge

export function setBlueprintMode(blueprint: boolean) {
  if (blueprint && !isBlueprintMode) {
    isBlueprintMode = true;
    if (blueprintTimer) clearTimeout(blueprintTimer);
    blueprintTimer = setTimeout(() => {
      blueprintTimer = null;
      // Cancel everything.
      for (const ac of fetches.values()) ac.abort();
      fetches.clear();
      // Evict everything with the handshake.
      for (const body of Array.from(optimized.keys())) evictOptimized(body);
    }, BLUEPRINT_PURGE_DELAY_MS);
  } else if (!blueprint && isBlueprintMode) {
    isBlueprintMode = false;
    if (blueprintTimer) {
      // User flipped back to SPACE before debounce fired: cancel the purge.
      clearTimeout(blueprintTimer);
      blueprintTimer = null;
    }
    // Next tick re-promotes the active moon.
  }
}

// Spectral mode switches (Titan + Enceladus)

/**
 * Spectral-mode switch. Every mode's placeholder is preloaded during
 * initialize(), so the new placeholder is in memory and the rebind is
 * synchronous: the user sees the new mode's low-res texture within a
 * frame of clicking the button. The optimized variant promotes on the
 * next tick if this body is the active hi-res owner.
 *
 * Sequence:
 *   1. Cancel any in-flight optimized fetch for the old mode.
 *   2. Evict the old optimized (its asset file is now stale).
 *   3. Rebind synchronously to the new mode's placeholder from
 *      `placeholdersByUrl`. Old placeholder texture is NOT disposed,
 *      it's still useful if the user toggles back. (~10 KB each, total
 *      cap is bounded by the static URL set.)
 *   4. Next tick promotes the new mode's optimized.
 */
function switchSpectralMode(body: MoonId, gl: THREE.WebGLRenderer): void {
  cancelFetch(body);
  if (optimized.has(body)) evictOptimized(body);

  const path = placeholderPathFor(body, currentTitanMode, currentEnceladusMode);
  const cached = placeholdersByUrl.get(path);
  if (cached) {
    placeholders.set(body, cached);
    setBinding(body, { texture: cached, tier: "placeholder" });
    return;
  }

  // Fallback path: a mode that wasn't preloaded for some reason. Load
  // it lazily. Only happens if initialize() failed for that URL.
  void (async () => {
    const ac = new AbortController();
    const tex = await loadTexture(path, ac.signal, gl);
    if (!tex) return;
    placeholdersByUrl.set(path, tex);
    // Only bind if the user hasn't switched modes again while we were
    // loading, otherwise we'd flash an outdated placeholder.
    const stillCurrentPath = placeholderPathFor(
      body,
      currentTitanMode,
      currentEnceladusMode,
    );
    if (stillCurrentPath !== path) return;
    placeholders.set(body, tex);
    setBinding(body, { texture: tex, tier: "placeholder" });
  })();
}

export function setTitanMode(mode: string, gl: THREE.WebGLRenderer) {
  if (currentTitanMode === mode) return;
  currentTitanMode = mode;
  switchSpectralMode("titan", gl);
}

export function setEnceladusMode(mode: string, gl: THREE.WebGLRenderer) {
  if (currentEnceladusMode === mode) return;
  currentEnceladusMode = mode;
  switchSpectralMode("enceladus", gl);
}
