"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { simulateHistory, simulateReading } from "@/lib/simulation";
import { fetchLiveReading } from "@/lib/sensors-live";

const DEMO_TICK_MS = 2500;
const HISTORY_STEP_MS = 10 * 60000;

/**
 * Runs for the whole app. In Demo Mode it seeds 24 h of simulated history and emits a
 * new simulated reading every few seconds. In Integration Mode it polls the configured
 * endpoint and never fills gaps with simulated values.
 */
export function SensorEngine() {
  const mode = useApp((s) => s.mode);
  const condition = useApp((s) => s.condition);
  const endpoint = useApp((s) => s.liveEndpoint);
  const pollMs = useApp((s) => s.pollMs);
  const lastHistoryAt = useRef(0);

  // Demo mode
  useEffect(() => {
    if (mode !== "demo") return;
    const { setHistory, pushReading, setConnection } = useApp.getState();
    setConnection("demo");
    const now = Date.now();
    const h = simulateHistory(now, condition);
    setHistory(h);
    lastHistoryAt.current = h[h.length - 1]?.timestamp ?? now;
    pushReading(simulateReading(now, condition), false);
    const id = window.setInterval(() => {
      const t = Date.now();
      const r = simulateReading(t, condition);
      const append = t - lastHistoryAt.current >= HISTORY_STEP_MS;
      if (append) lastHistoryAt.current = t;
      pushReading(r, append);
    }, DEMO_TICK_MS);
    return () => window.clearInterval(id);
  }, [mode, condition]);

  // Integration mode
  useEffect(() => {
    if (mode !== "live") return;
    const { setConnection, pushReading } = useApp.getState();
    let cancelled = false;
    let ac: AbortController | null = null;
    let lastAppend = 0;
    setConnection("connecting");
    const poll = async () => {
      ac?.abort();
      ac = new AbortController();
      try {
        const r = await fetchLiveReading(endpoint, useApp.getState().condition, ac.signal);
        if (cancelled) return;
        const append = r.timestamp - lastAppend >= 60000;
        if (append) lastAppend = r.timestamp;
        pushReading(r, append);
        setConnection("connected", r.origin === "backend-simulated" ? "Endpoint reports simulated data" : null);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        setConnection("error", e instanceof Error ? e.message : "Connection failed");
      }
    };
    poll();
    const id = window.setInterval(poll, Math.max(1000, pollMs));
    return () => {
      cancelled = true;
      ac?.abort();
      window.clearInterval(id);
    };
  }, [mode, endpoint, pollMs]);

  return null;
}
