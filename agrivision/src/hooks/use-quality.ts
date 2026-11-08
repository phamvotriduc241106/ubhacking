"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

export type RenderQuality = "high" | "lite" | "none";

/**
 * three.js r163+ renders only with WebGL 2. Older devices that offer just WebGL 1 would
 * pass a "webgl" check and then crash inside the renderer, so require WebGL 2 here and
 * show the static fallback otherwise.
 */
function hasWebGL2() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    // Release the probe context right away; browsers cap how many can be alive at once.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Picks a rendering tier. "lite" = fewer plants, no shadows, lower DPR.
 * "none" = WebGL unavailable, show the static fallback.
 */
export function useQuality(): { quality: RenderQuality; ready: boolean; reducedMotion: boolean } {
  const pref = useApp((s) => s.quality);
  const [auto, setAuto] = useState<{ q: RenderQuality; reduced: boolean } | null>(null);

  useEffect(() => {
    if (!hasWebGL2()) {
      setAuto({ q: "none", reduced: false });
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const small = window.innerWidth < 768;
    const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    setAuto({ q: small || weak ? "lite" : "high", reduced });
  }, []);

  if (!auto) return { quality: "lite", ready: false, reducedMotion: false };
  if (auto.q === "none") return { quality: "none", ready: true, reducedMotion: auto.reduced };
  return { quality: pref === "auto" ? auto.q : pref, ready: true, reducedMotion: auto.reduced };
}
