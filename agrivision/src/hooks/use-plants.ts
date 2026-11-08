"use client";

import { useMemo } from "react";
import { computePlants } from "@/lib/farm";
import { useApp } from "@/lib/store";

/** Plant states update when the weather changes or the reading moves meaningfully (not every tick). */
export function usePlants() {
  const latest = useApp((s) => s.latest);
  const condition = useApp((s) => s.condition);
  const tKey = latest ? Math.round(latest.temperatureC * 2) : 0;
  const hKey = latest ? Math.round(latest.humidityPct / 2) : 0;
  return useMemo(
    () => computePlants(latest, condition),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tKey, hKey, condition, latest == null],
  );
}
