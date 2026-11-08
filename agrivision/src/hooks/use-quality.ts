"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

export type RenderQuality = "high" | "lite" | "none";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
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
    if (!hasWebGL()) {
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
