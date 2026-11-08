"use client";

/**
 * Warm the browser cache with the 3D scene chunks so opening Smart Farm or Growth
 * shows the scene immediately instead of waiting for three.js to download.
 */
const loaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/components/three/farm-canvas"),
  "/farm": () => import("@/components/three/farm-canvas"),
  "/growth": () => import("@/components/three/growth-canvas"),
};
const started = new Set<string>();

export function prefetchScene(href: string) {
  const load = loaders[href];
  if (!load || started.has(href)) return;
  started.add(href);
  load().catch(() => started.delete(href));
}

/** After the page is idle, prefetch scenes unless the user asked to save data. */
export function prefetchScenesWhenIdle() {
  if (typeof window === "undefined") return () => {};
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return () => {};
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  const run = () => {
    prefetchScene("/farm");
    prefetchScene("/growth");
  };
  const timer = window.setTimeout(() => {
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 5000 });
    else run();
  }, 2500);
  return () => window.clearTimeout(timer);
}
