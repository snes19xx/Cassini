// src/scenes/cassini/lib/textureService.ts
//
// Moon texture lifecycle service: every moon holds an always-resident
// placeholder, and at most one at a time also holds the optimized texture.

import * as THREE from "three";
import { TABLEAUS, getActiveTableau } from "../data/tableaus";

export type MoonId =
  | "titan"
  | "iapetus"
  | "enceladus"
  | "mimas"
  | "tethys"
  | "dione"
  | "rhea"
  // No dedicated assets: janus and pandora render under 20 px in their
  // one tableau, so they borrow the Mimas texture (grey, cratered,
  // indistinguishable at that size).
  | "janus"
  | "pandora";

export const ALL_MOONS: MoonId[] = [
  "titan",
  "iapetus",
  "enceladus",
  "mimas",
  "tethys",
  "dione",
  "rhea",
  "janus",
  "pandora",
];

// How far ahead of a moon's window to start fetching its optimized
// texture during cruise/saturn-focus. 0.04 is about 7s at 1x playback.
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
  // Borrowed Mimas assets (see MoonId comment), browser-cached, no new fetch.
  janus: "/textures/placeholders/mimas_ph.webp",
  pandora: "/textures/placeholders/mimas_ph.webp",
};

const OPTIMIZED_PATH: Record<MoonId, string> = {
  iapetus: "/textures/optimized/iapetus_opt.webp",
  enceladus: "/textures/optimized/enceladus_opt.webp",
  mimas: "/textures/optimized/mimas_opt.webp",
  rhea: "/textures/optimized/rhea_opt.webp",
  dione: "/textures/optimized/dione_opt.webp",
  tethys: "/textures/optimized/tethys_opt.webp",
  titan: "/textures/optimized/titan_visible__opt.webp",
  // Never promoted in practice, only moons[0] owns the hi-res slot and
  // that's always Rhea in their one tableau. Entries exist for type
  // completeness.
  janus: "/textures/optimized/mimas_opt.webp",
  pandora: "/textures/optimized/mimas_opt.webp",
};

// Titan spectral mode to (placeholder, optimized) paths, matching
// TitanSpectralMode in missionStore.ts. Two on-disk naming quirks:
// titan_visible's optimized file has a double underscore, and titan_ir's
// placeholder lacks the _ph suffix.
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

// Enceladus spectral mode to paths. Only two modes today.
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

// Disposing a texture the same tick it's rebound races React's effect
// commit, so the next frame can render with a disposed GL handle. Every
// tick flushes the previous tick's queue instead.
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
  // Configure before the first GPU upload so mipmaps generate on the first
  // frame the texture is used, not after a racy `needsUpdate = true` cycle
  // that produces RGB-stripe artifacts.
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
    // Without this, moon maps render upside down.
    const bitmap = await createImageBitmap(blob, { imageOrientation: "flipY" });
    if (signal.aborted) {
      bitmap.close();
      return null;
    }
    const tDecode = performance.now();
    const tex = new THREE.Texture(bitmap);
    configureTexture(tex, gl.capabilities.getMaxAnisotropy());
    const tConfigure = performance.now();
    // Pre-upload to GPU now, outside the render loop, so the first frame
    // that uses this texture doesn't stall on the upload. Logging over
    // 200 ms here means the texture is almost certainly oversized.
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
 * Loads every moon placeholder plus every spectral-mode placeholder
 * (~60 KB total, all kept always-resident) so a spectral-button click can
 * rebind synchronously from `placeholdersByUrl` with no fetch.
 */
export async function initialize(gl: THREE.WebGLRenderer) {
  if (initialized) return;
  initialized = true;

  // Collect every placeholder URL we may need across body x spectral-mode.
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

// Multi-moon tableaus (group portraits) list their dominant moon first;
// that one gets the optimized slot, the others stay on placeholders.
const hiresBodyOf = (tab: (typeof TABLEAUS)[number]): string | null =>
  tab.body ?? tab.moons?.[0]?.body ?? null;

/**
 * The moon that should own the single optimized-tier slot at mission time
 * `t`: the active tableau's body if it's a moon, otherwise the next moon
 * if `t` is within `PROMOTE_LEAD_T` of its start. No grace window past
 * `tEnd`, or adjacent windows would match the wrong body first.
 */
function activeHiresOwner(t: number): MoonId | null {
  const active = getActiveTableau(t);
  if (active.kind === "moon") {
    const body = hiresBodyOf(active);
    if (body) return body as MoonId;
  }
  for (const tab of TABLEAUS) {
    if (tab.kind !== "moon") continue;
    const body = hiresBodyOf(tab);
    if (!body) continue;
    if (t >= tab.tStart - PROMOTE_LEAD_T && t < tab.tStart) {
      return body as MoonId;
    }
  }
  return null;
}

/**
 * Eviction handshake: rebind placeholder, DEFER dispose, drop cache.
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

/** Reconciles state each frame so at most one optimized texture is resident. */
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
 * Rebinds `body` to the new spectral mode's cached placeholder, synchronous
 * since initialize() already preloaded it. Cancels/evicts the old mode's
 * optimized texture; the new mode's optimized promotes on the next tick.
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

  // Only reached if initialize() failed to preload this mode's URL.
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
