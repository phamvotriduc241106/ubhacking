import type { WeatherData, WeatherDay, WeatherHour } from "./types";
import { mulberry32 } from "./utils";

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

export const LOCATIONS: Location[] = [
  { name: "Buffalo, NY", latitude: 42.8864, longitude: -78.8784 },
  { name: "Salinas, CA", latitude: 36.6777, longitude: -121.6555 },
  { name: "Almería, Spain", latitude: 36.834, longitude: -2.4637 },
  { name: "Westland, Netherlands", latitude: 51.99, longitude: 4.2 },
  { name: "Ho Chi Minh City, Vietnam", latitude: 10.8231, longitude: 106.6297 },
];

export const PAST_DAYS = 14;
export const FORECAST_DAYS = 7;

/** WMO weather interpretation codes, condensed. */
export function describeCode(code: number): { label: string; kind: "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm" } {
  if (code === 0) return { label: "Clear", kind: "sun" };
  if (code <= 2) return { label: "Partly cloudy", kind: "partly" };
  if (code === 3) return { label: "Overcast", kind: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", kind: "fog" };
  if (code >= 51 && code <= 67) return { label: code < 61 ? "Drizzle" : "Rain", kind: "rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", kind: "snow" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", kind: "rain" };
  if (code >= 85 && code <= 86) return { label: "Snow showers", kind: "snow" };
  if (code >= 95) return { label: "Thunderstorm", kind: "storm" };
  return { label: "Unknown", kind: "cloud" };
}

/**
 * "Today" and "this hour" in the weather location's own local time, formatted like
 * Open-Meteo's daily dates (YYYY-MM-DD) and hourly times (YYYY-MM-DDTHH).
 * Comparing against new Date().toISOString() (UTC) shifts the forecast by the UTC offset.
 */
export function locationNow(w: Pick<WeatherData, "utcOffsetSeconds">, offsetMs = 0) {
  const t = new Date(Date.now() + offsetMs + w.utcOffsetSeconds * 1000).toISOString();
  return { date: t.slice(0, 10), hour: t.slice(0, 13) };
}

/** Browser-local YYYY-MM-DD / YYYY-MM-DDTHH:MM, used for the simulated fallback. */
const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localMinute = (d: Date) => `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export async function fetchWeather(loc: Location, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    hourly: "temperature_2m,relative_humidity_2m,precipitation",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,relative_humidity_2m_mean",
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    timezone: "auto",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
  const j = await res.json();
  const utcOffsetSeconds: number = typeof j.utc_offset_seconds === "number" ? j.utc_offset_seconds : 0;
  const today = locationNow({ utcOffsetSeconds }).date;
  const days: WeatherDay[] = j.daily.time.map((d: string, i: number) => ({
    date: d,
    tMax: j.daily.temperature_2m_max[i],
    tMin: j.daily.temperature_2m_min[i],
    humidity: j.daily.relative_humidity_2m_mean?.[i] ?? NaN,
    precipitation: j.daily.precipitation_sum[i] ?? 0,
    code: j.daily.weather_code[i],
    isForecast: d > today,
  }));
  const hours: WeatherHour[] = j.hourly.time.map((t: string, i: number) => ({
    time: t,
    temp: j.hourly.temperature_2m[i],
    humidity: j.hourly.relative_humidity_2m[i],
    precipitation: j.hourly.precipitation[i] ?? 0,
  }));
  return {
    source: "open-meteo",
    locationName: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    fetchedAt: Date.now(),
    utcOffsetSeconds,
    current: {
      temp: j.current.temperature_2m,
      humidity: j.current.relative_humidity_2m,
      code: j.current.weather_code,
      wind: j.current.wind_speed_10m,
    },
    days: days.filter((d) => !Number.isNaN(d.tMax)),
    hours,
  };
}

/** Labeled fallback used when the weather service cannot be reached. */
export function simulateWeather(loc: Location): WeatherData {
  const rand = mulberry32(Math.floor(Date.now() / 86400000) + Math.round(loc.latitude * 100));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days: WeatherDay[] = [];
  for (let i = -PAST_DAYS; i < FORECAST_DAYS; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const wet = rand() < 0.28;
    const base = 24 + Math.sin(i / 4) * 3;
    days.push({
      date: localDate(d),
      tMax: +(base + rand() * 3 - (wet ? 3 : 0)).toFixed(1),
      tMin: +(base - 9 + rand() * 2).toFixed(1),
      humidity: Math.round(58 + rand() * 12 + (wet ? 18 : 0)),
      precipitation: wet ? +(rand() * 18 + 1).toFixed(1) : rand() < 0.2 ? +(rand() * 1.5).toFixed(1) : 0,
      code: wet ? 61 : rand() < 0.4 ? 2 : rand() < 0.5 ? 3 : 0,
      isForecast: i > 0,
    });
  }
  const hours: WeatherHour[] = [];
  for (let h = -PAST_DAYS * 24; h < FORECAST_DAYS * 24; h++) {
    const t = new Date(now.getTime() + h * 3600000);
    const hod = t.getHours();
    const phase = Math.sin(((hod - 9) / 24) * Math.PI * 2);
    hours.push({
      time: localMinute(t),
      temp: +(19 + 6 * phase + rand()).toFixed(1),
      humidity: Math.round(68 - 16 * phase + rand() * 4),
      precipitation: rand() < 0.04 ? +(rand() * 2).toFixed(1) : 0,
    });
  }
  const todayIdx = PAST_DAYS;
  return {
    source: "simulated",
    locationName: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    fetchedAt: Date.now(),
    // The simulation is generated in the browser's local time.
    utcOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    current: { temp: days[todayIdx].tMax - 2, humidity: days[todayIdx].humidity, code: days[todayIdx].code, wind: 9 },
    days,
    hours,
  };
}
