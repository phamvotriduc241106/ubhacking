import type { SensorReading, WeatherCondition, ZoneId } from "./types";
import { clamp, mulberry32 } from "./utils";

/** The ultrasonic sensor is mounted this far above the soil, pointing down at the canopy. */
export const SENSOR_MOUNT_HEIGHT_CM = 50;

const TAU = Math.PI * 2;

export const WEATHER_PROFILES: Record<
  WeatherCondition,
  { tempOffset: number; humidityOffset: number; lightFactor: number; label: string }
> = {
  sunny: { tempOffset: 2.4, humidityOffset: -6, lightFactor: 1, label: "Sunny" },
  cloudy: { tempOffset: -1.6, humidityOffset: 8, lightFactor: 0.32, label: "Overcast" },
  rainy: { tempOffset: -3.6, humidityOffset: 22, lightFactor: 0.14, label: "Rain" },
};

function hourOfDay(ts: number) {
  const d = new Date(ts);
  return d.getHours() + d.getMinutes() / 60;
}

/** Smooth diurnal baseline for a summer tomato bed (outdoor, temperate climate). */
export function baseline(ts: number) {
  const h = hourOfDay(ts);
  const phase = Math.sin(((h - 9) / 24) * TAU); // peaks ~15:00
  const temp = 22 + 6.2 * phase;
  const humidity = 66 - 17 * phase;
  const daylight = h > 5.8 && h < 20.2 ? Math.sin(((h - 5.8) / 14.4) * Math.PI) : 0;
  const light = Math.max(0, daylight) ** 1.25 * 62000;
  return { temp, humidity, light };
}

/** Canopy height grows slowly over time; ~0.12 cm per hour in vegetative growth. */
function canopyAt(ts: number) {
  const days = (ts - Date.UTC(2026, 0, 1)) / 86400000;
  return 14 + ((days * 2.9) % 22);
}

export function simulateReading(
  ts: number,
  condition: WeatherCondition,
  noiseSeed = Math.floor(ts / 1000),
): SensorReading {
  const rand = mulberry32(noiseSeed);
  const b = baseline(ts);
  const p = WEATHER_PROFILES[condition];
  const jitter = (amp: number) => (rand() - 0.5) * 2 * amp;
  const canopy = canopyAt(ts) + jitter(0.15);
  return {
    timestamp: ts,
    temperatureC: +(b.temp + p.tempOffset + jitter(0.35)).toFixed(2),
    humidityPct: +clamp(b.humidity + p.humidityOffset + jitter(1.2), 20, 99).toFixed(1),
    lightLux: Math.round(Math.max(0, b.light * p.lightFactor * (1 + jitter(0.06)))),
    canopyHeightCm: +canopy.toFixed(1),
    distanceCm: +(SENSOR_MOUNT_HEIGHT_CM - canopy).toFixed(1),
    condition,
    origin: "simulated",
  };
}

/**
 * 24 hours of 10-minute demo history. The weather pattern for the day is seeded,
 * and the last few hours follow the condition currently selected in the UI.
 */
export function simulateHistory(now: number, current: WeatherCondition, hours = 24, stepMin = 10) {
  const out: SensorReading[] = [];
  const step = stepMin * 60000;
  const start = Math.floor((now - hours * 3600000) / step) * step;
  const daySeed = Math.floor(now / 86400000);
  const pick = mulberry32(daySeed);
  const pattern: WeatherCondition[] = Array.from({ length: 8 }, () => {
    const r = pick();
    return r < 0.55 ? "sunny" : r < 0.85 ? "cloudy" : "rainy";
  });
  for (let ts = start; ts <= now; ts += step) {
    const hoursAgo = (now - ts) / 3600000;
    const cond = hoursAgo < 3 ? current : pattern[Math.floor(hoursAgo / 3) % pattern.length];
    out.push(simulateReading(ts, cond, Math.floor(ts / step)));
  }
  return out;
}

export const ZONE_OFFSETS: Record<ZoneId, { temp: number; humidity: number; light: number }> = {
  A: { temp: -0.4, humidity: 2.5, light: 0.94 },
  B: { temp: 0.3, humidity: -1, light: 1.0 },
  C: { temp: -0.2, humidity: 5.5, light: 0.86 },
  D: { temp: 1.4, humidity: -4, light: 1.06 },
};

export function zoneReading(r: SensorReading, zone: ZoneId) {
  const o = ZONE_OFFSETS[zone];
  return {
    temperatureC: +(r.temperatureC + o.temp).toFixed(1),
    humidityPct: +clamp(r.humidityPct + o.humidity, 0, 100).toFixed(1),
    lightLux: r.lightLux == null ? null : Math.round(r.lightLux * o.light),
  };
}
