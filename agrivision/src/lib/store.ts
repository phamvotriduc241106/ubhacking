"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AnalysisResult,
  ConnectionStatus,
  DataMode,
  SensorReading,
  Thresholds,
  WeatherCondition,
  WeatherData,
  ZoneId,
} from "./types";
import { DEFAULT_THRESHOLDS, THRESHOLD_FIELDS } from "./thresholds";
import { LOCATIONS, type Location } from "./weather";

export type QualityPref = "auto" | "high" | "lite";

interface AppState {
  /* data source */
  mode: DataMode;
  liveEndpoint: string;
  pollMs: number;
  connection: ConnectionStatus;
  connectionMessage: string | null;
  lastLiveAt: number | null;

  /* sensor data */
  history: SensorReading[];
  recent: SensorReading[];
  latest: SensorReading | null;

  /* environment + farm */
  condition: WeatherCondition;
  selectedZone: ZoneId | "all";
  selectedPlantId: string | null;
  healthOverlay: boolean;
  showSensors: boolean;

  /* weather intelligence */
  location: Location;
  weatherData: WeatherData | null;

  /* settings */
  thresholds: Thresholds;
  quality: QualityPref;

  /* analysis */
  lastAnalysis: AnalysisResult | null;

  setMode: (m: DataMode) => void;
  setLiveConfig: (c: { liveEndpoint?: string; pollMs?: number }) => void;
  setConnection: (s: ConnectionStatus, msg?: string | null) => void;
  setHistory: (h: SensorReading[]) => void;
  pushReading: (r: SensorReading, appendToHistory: boolean) => void;
  clearReadings: () => void;
  setCondition: (c: WeatherCondition) => void;
  setZone: (z: ZoneId | "all") => void;
  selectPlant: (id: string | null) => void;
  setHealthOverlay: (v: boolean) => void;
  setShowSensors: (v: boolean) => void;
  setLocation: (l: Location) => void;
  setWeatherData: (w: WeatherData | null) => void;
  setThreshold: <K extends keyof Thresholds>(k: K, v: Thresholds[K]) => void;
  resetThresholds: () => void;
  setQuality: (q: QualityPref) => void;
  setAnalysis: (a: AnalysisResult | null) => void;
}

const MAX_RECENT = 60;

const CONDITIONS: WeatherCondition[] = ["sunny", "cloudy", "rainy"];
const QUALITIES: QualityPref[] = ["auto", "high", "lite"];
const MODES: DataMode[] = ["demo", "live"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Keep only saved fields that have the right type and range; drop everything else. */
export function sanitizePersisted(raw: unknown): Partial<AppState> {
  if (!isObj(raw)) return {};
  const out: Partial<AppState> = {};
  if (MODES.includes(raw.mode as DataMode)) out.mode = raw.mode as DataMode;
  if (typeof raw.liveEndpoint === "string" && raw.liveEndpoint.trim()) out.liveEndpoint = raw.liveEndpoint.trim();
  if (finite(raw.pollMs)) out.pollMs = Math.min(600000, Math.max(1000, raw.pollMs));
  if (CONDITIONS.includes(raw.condition as WeatherCondition)) out.condition = raw.condition as WeatherCondition;
  if (QUALITIES.includes(raw.quality as QualityPref)) out.quality = raw.quality as QualityPref;
  if (typeof raw.healthOverlay === "boolean") out.healthOverlay = raw.healthOverlay;
  if (typeof raw.showSensors === "boolean") out.showSensors = raw.showSensors;
  const loc = raw.location;
  if (isObj(loc) && typeof loc.name === "string" && finite(loc.latitude) && finite(loc.longitude) && Math.abs(loc.latitude) <= 90 && Math.abs(loc.longitude) <= 180) {
    out.location = { name: loc.name, latitude: loc.latitude, longitude: loc.longitude };
  }
  if (isObj(raw.thresholds)) {
    const t: Partial<Thresholds> = {};
    for (const f of THRESHOLD_FIELDS) {
      const v = raw.thresholds[f.key];
      if (finite(v)) t[f.key] = Math.min(f.max, Math.max(f.min, v));
    }
    out.thresholds = { ...DEFAULT_THRESHOLDS, ...t };
  }
  return out;
}
const MAX_HISTORY = 24 * 6 + 2;

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      mode: "demo",
      liveEndpoint: "/api/folland/sensors/latest",
      pollMs: 5000,
      connection: "demo",
      connectionMessage: null,
      lastLiveAt: null,

      history: [],
      recent: [],
      latest: null,

      condition: "sunny",
      selectedZone: "all",
      selectedPlantId: null,
      healthOverlay: true,
      showSensors: true,

      location: LOCATIONS[0],
      weatherData: null,

      thresholds: DEFAULT_THRESHOLDS,
      quality: "auto",
      lastAnalysis: null,

      setMode: (mode) =>
        set({ mode, history: [], recent: [], latest: null, connection: mode === "demo" ? "demo" : "connecting", connectionMessage: null }),
      setLiveConfig: (c) => set(c),
      setConnection: (connection, msg = null) =>
        set((s) => ({ connection, connectionMessage: msg, lastLiveAt: connection === "connected" ? Date.now() : s.lastLiveAt })),
      setHistory: (history) => set({ history, latest: history[history.length - 1] ?? null }),
      pushReading: (r, appendToHistory) =>
        set((s) => ({
          latest: r,
          recent: [...s.recent, r].slice(-MAX_RECENT),
          history: appendToHistory ? [...s.history, r].slice(-MAX_HISTORY) : s.history,
        })),
      clearReadings: () => set({ history: [], recent: [], latest: null }),
      setCondition: (condition) => set({ condition }),
      setZone: (selectedZone) => set({ selectedZone, selectedPlantId: null }),
      selectPlant: (selectedPlantId) => set({ selectedPlantId }),
      setHealthOverlay: (healthOverlay) => set({ healthOverlay }),
      setShowSensors: (showSensors) => set({ showSensors }),
      setLocation: (location) => set({ location, weatherData: null }),
      setWeatherData: (weatherData) => set({ weatherData }),
      setThreshold: (k, v) => set((s) => ({ thresholds: { ...s.thresholds, [k]: v } })),
      resetThresholds: () => set({ thresholds: DEFAULT_THRESHOLDS }),
      setQuality: (quality) => set({ quality }),
      setAnalysis: (lastAnalysis) => set({ lastAnalysis }),
    }),
    {
      name: "folland-settings",
      version: 1,
      storage: createJSONStorage(() => {
        try {
          const k = "__folland_probe";
          window.localStorage.setItem(k, "1");
          window.localStorage.removeItem(k);
          return window.localStorage;
        } catch {
          const mem = new Map<string, string>();
          return {
            getItem: (n: string) => mem.get(n) ?? null,
            setItem: (n: string, v: string) => void mem.set(n, v),
            removeItem: (n: string) => void mem.delete(n),
          };
        }
      }),
      partialize: (s) => ({
        mode: s.mode,
        liveEndpoint: s.liveEndpoint,
        pollMs: s.pollMs,
        condition: s.condition,
        thresholds: s.thresholds,
        quality: s.quality,
        location: s.location,
        healthOverlay: s.healthOverlay,
        showSensors: s.showSensors,
      }),
      // Saved settings come from the browser and may be corrupt, edited by hand, or written by
      // an older version. Validate every field so a bad value can never crash the first render.
      merge: (persisted, current) => {
        const p = sanitizePersisted(persisted);
        return {
          ...current,
          ...p,
          thresholds: { ...DEFAULT_THRESHOLDS, ...(p.thresholds ?? {}) },
          connection: p.mode === "live" ? "connecting" : "demo",
        };
      },
    },
  ),
);
