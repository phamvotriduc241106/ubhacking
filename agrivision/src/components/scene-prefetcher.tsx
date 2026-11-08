"use client";

import { useEffect } from "react";
import { prefetchScenesWhenIdle } from "@/lib/prefetch";

/** Prefetches the 3D scene chunks once the current page is idle. Renders nothing. */
export function ScenePrefetcher() {
  useEffect(() => prefetchScenesWhenIdle(), []);
  return null;
}
