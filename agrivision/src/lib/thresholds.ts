import type { Thresholds } from "./types";

export const DEFAULT_THRESHOLDS: Thresholds = {
  tempHighC: 30,
  tempLowC: 12,
  humidityHighPct: 85,
  humidityHighHours: 4,
  lightLowLux: 18000,
  growthStallCm: 0.8,
  rainHeavyMm: 20,
  frostC: 3,
};
