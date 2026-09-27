const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Rewrites a site-root asset path onto the deployed base path. */
export function assetUrl(path: string): string {
  return path.startsWith("/") ? `${BASE}${path}` : path;
}
