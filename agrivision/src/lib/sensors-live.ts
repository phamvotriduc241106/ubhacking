import type { DataOrigin, SensorReading, WeatherCondition } from "./types";

/**
 * Integration mode: poll any HTTP endpoint that returns JSON. Two shapes are accepted:
 *
 * 1. FolLand 3D shape
 *    { "temperatureC": 24.1, "humidityPct": 61, "lightLux": 32000,
 *      "distanceCm": 33.5, "canopyHeightCm": 16.5, "live": true }
 *
 * 2. FolLand backend shape (GET /api/sensors/latest)
 *    { "air_temperature_c": 23.8, "air_relative_humidity_pct": 62.5,
 *      "ultrasonic_distance_cm": 34.2, "canopy_height_proxy_cm": 15.8, "data_mode": "simulated" }
 *
 * Readings are labeled "live" only when the payload says so; otherwise they are
 * labeled "backend-simulated" so demo data is never presented as hardware data.
 */
export async function fetchLiveReading(endpoint: string, condition: WeatherCondition, signal?: AbortSignal): Promise<SensorReading> {
  const res = await fetch(endpoint, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Endpoint returned ${res.status}`);
  const j = await res.json();
  const num = (...vals: unknown[]) => {
    for (const v of vals) if (typeof v === "number" && Number.isFinite(v)) return v;
    return null;
  };
  const temperatureC = num(j.temperatureC, j.air_temperature_c, j.temperature);
  const humidityPct = num(j.humidityPct, j.air_relative_humidity_pct, j.humidity);
  if (temperatureC == null || humidityPct == null) {
    if (j.status === "disconnected" || j.data_mode === "unavailable") throw new Error("Sensor reports it is disconnected");
    throw new Error("Payload is missing temperature or humidity");
  }
  const isLive = j.live === true || j.data_mode === "live";
  const origin: DataOrigin = isLive ? "live" : "backend-simulated";
  return {
    timestamp: Date.now(),
    temperatureC,
    humidityPct,
    lightLux: num(j.lightLux, j.light_lux, j.lux),
    distanceCm: num(j.distanceCm, j.ultrasonic_distance_cm, j.distance_cm),
    canopyHeightCm: num(j.canopyHeightCm, j.canopy_height_proxy_cm),
    condition,
    origin,
  };
}
