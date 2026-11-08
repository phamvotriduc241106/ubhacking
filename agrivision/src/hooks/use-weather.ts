"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { fetchWeather } from "@/lib/weather";

/** Loads weather for the selected location once and caches it in the store for 30 minutes. */
export function useWeather() {
  const location = useApp((s) => s.location);
  const data = useApp((s) => s.weatherData);
  const setData = useApp((s) => s.setWeatherData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchWeather(location, signal);
        setData(result);
        setLastSuccess(result.fetchedAt);
      } catch (e) {
        if (signal?.aborted) return;
        setError(e instanceof Error ? e.message : "Weather service unavailable");
        setData(null);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [location, setData],
  );

  useEffect(() => {
    setLastSuccess(null);
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.name, location.latitude, location.longitude, location.timezone]);

  return { data, loading, error, lastSuccess, reload: () => load() };
}
