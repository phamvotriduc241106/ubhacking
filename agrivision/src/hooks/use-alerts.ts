"use client";

import { useMemo } from "react";
import { buildAlerts } from "@/lib/recommendations";
import { useApp } from "@/lib/store";

export function useAlerts() {
  const latest = useApp((s) => s.latest);
  const history = useApp((s) => s.history);
  const weather = useApp((s) => s.weatherData);
  const analysis = useApp((s) => s.lastAnalysis);
  const thresholds = useApp((s) => s.thresholds);
  return useMemo(
    () => buildAlerts({ latest, history, weather, analysis, thresholds }),
    [latest, history, weather, analysis, thresholds],
  );
}
