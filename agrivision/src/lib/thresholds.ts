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

export const THRESHOLD_FIELDS: {
  key: keyof Thresholds;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  help: string;
}[] = [
  { key: "tempHighC", label: "High temperature", unit: "°C", min: 24, max: 40, step: 0.5, help: "Alert when air temperature rises above this." },
  { key: "tempLowC", label: "Low temperature", unit: "°C", min: 0, max: 18, step: 0.5, help: "Alert when air temperature falls below this." },
  { key: "humidityHighPct", label: "High humidity", unit: "%", min: 60, max: 98, step: 1, help: "Humidity considered elevated." },
  { key: "humidityHighHours", label: "Elevated humidity duration", unit: "h", min: 1, max: 12, step: 1, help: "Hours above the humidity limit before a fungal-risk alert." },
  { key: "lightLowLux", label: "Low daylight average", unit: "lux", min: 2000, max: 50000, step: 1000, help: "Average daytime light below this counts as low." },
  { key: "growthStallCm", label: "Minimum 24 h canopy growth", unit: "cm", min: 0, max: 5, step: 0.1, help: "Flag slow growth when the canopy gains less than this in 24 h." },
  { key: "rainHeavyMm", label: "Heavy rain (next 24 h)", unit: "mm", min: 5, max: 60, step: 1, help: "Forecast rain above this triggers an irrigation alert." },
  { key: "frostC", label: "Cold-night warning", unit: "°C", min: -2, max: 10, step: 0.5, help: "Forecast minimum below this triggers a protection alert." },
];
