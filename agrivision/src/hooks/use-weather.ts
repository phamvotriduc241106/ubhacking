"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { fetchWeather, simulateWeather } from "@/lib/weather";

/** Loads weather for the selected location once and caches it in the store for 30 minutes. */
export function useWeather() {
  const location = useApp((s) => s.location);
  const data = useApp((s) => s.weatherData);
  const setData = useApp((s) => s.setWeatherData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        setData(await fetchWeather(location, signal));
      } catch (e) {
        if (signal?.aborted) return;
        setError(e instanceof Error ? e.message : "Weather service unavailable");
        setData(simulateWeather(location));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [location, setData],
  );

  useEffect(() => {
    const fresh = data && data.locationName === location.name && Date.now() - data.fetchedAt < 30 * 60000;
    if (fresh) return;
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.name]);

  return { data, loading, error, reload: () => load() };
}
