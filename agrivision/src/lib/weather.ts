import type { WeatherData, WeatherDay, WeatherHour } from "./types";

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export const LOCATIONS: Location[] = [
  { name: "Petrolina, Brazil", latitude: -9.3891, longitude: -40.5031, timezone: "America/Recife" },
  { name: "Buffalo, NY", latitude: 42.8864, longitude: -78.8784 },
  { name: "Salinas, CA", latitude: 36.6777, longitude: -121.6555 },
  { name: "Almería, Spain", latitude: 36.834, longitude: -2.4637 },
  { name: "Westland, Netherlands", latitude: 51.99, longitude: 4.2 },
  { name: "Ho Chi Minh City, Vietnam", latitude: 10.8231, longitude: 106.6297 },
];

export const PAST_DAYS = 14;
export const FORECAST_DAYS = 7;

/** WMO weather interpretation codes, condensed. */
export function describeCode(code: number | null): { label: string; kind: "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm" } {
  if (code == null) return { label: "Unavailable", kind: "cloud" };
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

/** Parse the API's local timestamps using its returned UTC offset. */
export function latestHourlyIndex(times: unknown, offsetSeconds: number, now = Date.now()): number | null {
  if (!Array.isArray(times)) return null;
  let bestTime = -Infinity, bestIndex: number | null = null;
  times.forEach((value, index) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return;
    const instant = Date.parse(value + ":00Z") - offsetSeconds * 1000;
    if (Number.isFinite(instant) && instant <= now && instant > bestTime) { bestTime = instant; bestIndex = index; }
  });
  return bestIndex;
}

const number = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const at = (arr: unknown, index: number | null): number | null => index !== null && Array.isArray(arr) ? number(arr[index]) : null;

export function parseWeather(j: any, loc: Location, now = Date.now()): WeatherData {
  if (!j || !j.current || !j.hourly || !Array.isArray(j.hourly.time)) throw new Error("Incomplete weather response");
  const offset = number(j.utc_offset_seconds);
  const utcOffsetSeconds = offset ?? 0;
  const today = new Date(now + utcOffsetSeconds * 1000).toISOString().slice(0, 10);
  const index = offset === null ? null : latestHourlyIndex(j.hourly.time, offset, now);
  const dailyTimes = Array.isArray(j.daily?.time) ? j.daily.time : [];
  const days: WeatherDay[] = dailyTimes.flatMap((date: unknown, i: number) => {
    const tMax = at(j.daily.temperature_2m_max, i), tMin = at(j.daily.temperature_2m_min, i);
    const humidity = at(j.daily.relative_humidity_2m_mean, i), precipitation = at(j.daily.precipitation_sum, i), code = at(j.daily.weather_code, i);
    return typeof date === "string" && tMax !== null && tMin !== null && humidity !== null && precipitation !== null && code !== null ? [{date, tMax, tMin, humidity, precipitation, code, isForecast: date > today}] : [];
  });
  const hours: WeatherHour[] = j.hourly.time.flatMap((time: unknown, i: number) => {
    const temp = at(j.hourly.temperature_2m, i), humidity = at(j.hourly.relative_humidity_2m, i), precipitation = at(j.hourly.precipitation, i);
    return typeof time === "string" && temp !== null && humidity !== null && precipitation !== null ? [{time, temp, humidity, precipitation}] : [];
  });
  const recent = hours.filter(h => { const instant = Date.parse(h.time + ":00Z") - utcOffsetSeconds * 1000; return instant <= now && instant > now - 24 * 3600000; });
  const rain24 = offset !== null && recent.length === 24 && new Set(recent.map(h => h.time)).size === 24 ? recent.reduce((sum, h) => sum + h.precipitation, 0) : null;
  return {
    source: "open-meteo", locationName: loc.name, latitude: loc.latitude, longitude: loc.longitude,
    fetchedAt: now, utcOffsetSeconds, timezone: typeof j.timezone === "string" ? j.timezone : loc.timezone ?? "UTC",
    current: { temp: number(j.current.temperature_2m), humidity: number(j.current.relative_humidity_2m), code: number(j.current.weather_code), wind: number(j.current.wind_speed_10m), precipitation: number(j.current.precipitation), time: typeof j.current.time === "string" ? j.current.time : null },
    soil: { temperature: at(j.hourly.soil_temperature_0cm, index), moisture: at(j.hourly.soil_moisture_0_to_1cm, index), time: index === null ? null : j.hourly.time[index] },
    rain24, days, hours,
  };
}

export async function fetchWeather(loc: Location, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({ latitude: String(loc.latitude), longitude: String(loc.longitude),
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    hourly: "temperature_2m,relative_humidity_2m,precipitation,soil_temperature_0cm,soil_moisture_0_to_1cm",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,relative_humidity_2m_mean",
    past_days: String(PAST_DAYS), forecast_days: String(FORECAST_DAYS), timezone: loc.timezone ?? "auto" });
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 10000);
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
    return parseWeather(await res.json(), loc);
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
