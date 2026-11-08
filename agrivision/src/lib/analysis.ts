import type { AnalysisResult, CropCondition, EnvironmentRating, Ripeness, SensorReading, Thresholds } from "./types";
import { round } from "./utils";

type ColorStats = NonNullable<AnalysisResult["colorStats"]>;

/** Pixel color shares, computed in the browser from a downscaled copy of the photo. */
export async function measureColors(file: File): Promise<ColorStats> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("This image could not be decoded by the browser."));
      el.src = url;
    });
    const size = 112;
    const scale = Math.min(1, size / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const c = { red: 0, orange: 0, green: 0, yellow: 0, brown: 0 };
    let counted = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const v = max, d = max - min, s = max === 0 ? 0 : d / max;
      if (s < 0.22 || v < 0.12) continue; // ignore greys, sky glare, shadows
      let hue = 0;
      if (d > 0) {
        if (max === r) hue = 60 * (((g - b) / d) % 6);
        else if (max === g) hue = 60 * ((b - r) / d + 2);
        else hue = 60 * ((r - g) / d + 4);
      }
      if (hue < 0) hue += 360;
      counted++;
      if ((hue < 14 || hue > 340) && v > 0.3) c.red++;
      else if (hue >= 14 && hue < 42 && v < 0.5) c.brown++;
      else if (hue >= 14 && hue < 42) c.orange++;
      else if (hue >= 42 && hue < 68) c.yellow++;
      else if (hue >= 68 && hue < 170) c.green++;
    }
    const n = Math.max(1, counted);
    return {
      red: c.red / n,
      orange: c.orange / n,
      green: c.green / n,
      yellow: c.yellow / n,
      brown: c.brown / n,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function rateEnvironment(r: SensorReading | null, t: Thresholds): { rating: EnvironmentRating; notes: string[] } {
  if (!r) return { rating: "monitor", notes: ["No sensor reading available."] };
  const notes: string[] = [];
  let score = 0;
  if (r.temperatureC > t.tempHighC) { score += 2; notes.push(`Air ${round(r.temperatureC)} °C is above the ${t.tempHighC} °C limit.`); }
  else if (r.temperatureC > t.tempHighC - 3) { score += 1; notes.push(`Air ${round(r.temperatureC)} °C is close to the heat limit.`); }
  if (r.temperatureC < t.tempLowC) { score += 2; notes.push(`Air ${round(r.temperatureC)} °C is below the ${t.tempLowC} °C limit.`); }
  if (r.humidityPct > t.humidityHighPct) { score += 1; notes.push(`Humidity ${round(r.humidityPct)}% raises fungal risk.`); }
  if (r.humidityPct < 35) { score += 1; notes.push(`Humidity ${round(r.humidityPct)}% is low and can stress flowers.`); }
  if (!notes.length) notes.push(`Air ${round(r.temperatureC)} °C and ${round(r.humidityPct)}% RH are within your limits.`);
  return { rating: score >= 2 ? "stressful" : score === 1 ? "monitor" : "favorable", notes };
}


export function demoAnalysis(file: File, stats: ColorStats, reading: SensorReading | null, t: Thresholds): AnalysisResult {
  const foliage = stats.green + stats.yellow + stats.brown;
  const fruit = stats.red + stats.orange;
  let ripeness: AnalysisResult["ripeness"];
  if (fruit < 0.03 && stats.green > 0.4) ripeness = "not_applicable";
  else if (stats.red > 0.16 && stats.brown > 0.14) ripeness = "overripe";
  else if (stats.red > 0.16) ripeness = "ripe";
  else if (stats.red > 0.04 || stats.orange > 0.1) ripeness = "turning";
  else ripeness = "unripe";

  const yellowShare = foliage > 0 ? stats.yellow / foliage : 0;
  const brownShare = foliage > 0 ? stats.brown / foliage : 0;
  const symptoms: string[] = [];
  let cropCondition: CropCondition = "unknown";
  if (brownShare > 0.25 && foliage > 0.2) {
    cropCondition = "attention";
    symptoms.push(`Brown areas cover about ${Math.round(brownShare * 100)}% of plant-colored pixels`);
  } else if (yellowShare > 0.22 && foliage > 0.2) {
    cropCondition = "attention";
    symptoms.push(`Yellow tones cover about ${Math.round(yellowShare * 100)}% of foliage-colored pixels`);
  }
  if (!symptoms.length) symptoms.push("No unusual colors detected; this does not establish plant health.");

  const env = rateEnvironment(reading, t);
  return {
    id: `demo-${Date.now().toString(36)}`,
    createdAt: Date.now(),
    source: "demo",
    provider: "Demo color heuristic",
    imageName: file.name,
    cropCondition,
    ripeness,
    confidence: null,
    symptoms,
    summary:
      "Demo result. A simple pixel-color heuristic estimated these labels in your browser. No AI model looked at this photo, and the labels can be wrong for lighting, backgrounds or varieties that are not red when ripe.",
    suggestions: ["Demo only: inspect the plant and soil before making any decision. This color heuristic is not a diagnosis."],
    environment: env.rating,
    environmentNotes: env.notes,
    colorStats: stats,
  };
}

/* ---------- FolLand backend (FastAPI + Gemini) bridge ---------- */

export interface BackendStatus {
  reachable: boolean;
  app?: string;
}

export async function checkBackend(signal?: AbortSignal): Promise<BackendStatus> {
  try {
    const res = await fetch("/api/folland/health", { signal, cache: "no-store" });
    if (!res.ok) return { reachable: false };
    const j = await res.json();
    return { reachable: j?.status === "healthy", app: j?.app };
  } catch {
    return { reachable: false };
  }
}

/** Send the photo to the server; model and Gemini failures remain explicit. */
export async function aiAnalysis(
  file: File,
  soilCondition: string,
  locale: string,
  reading: SensorReading | null,
  t: Thresholds,
  manual: { temperatureC: number | null; humidityPct: number | null },
): Promise<AnalysisResult> {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("crop", "tomato");
  fd.append("soil_condition", soilCondition);
  fd.append("locale", locale);
  if (manual.temperatureC !== null) fd.append("manual_temperature_c", String(manual.temperatureC));
  if (manual.humidityPct !== null) fd.append("manual_humidity_pct", String(manual.humidityPct));
  const res = await fetch("/api/folland/analyze", { method: "POST", body: fd });
  if (!res.ok) {
    let detail = `Backend returned ${res.status}`;
    try { const j = await res.json(); if (typeof j.detail === "string") detail = j.detail; } catch {}
    throw new Error(detail);
  }
  const j = await res.json();
  const v = j.visual_observations ?? {};
  const stage = String(v.maturity_stage ?? "uncertain");
  const ripeness: AnalysisResult["ripeness"] = stage === "red" ? "ripe" : stage === "turning" ? "turning" : stage === "green" ? "unripe" : "unknown";
  const symptoms = [j.gemini_observation?.leaf_description, j.gemini_observation?.uncertainty].filter((x): x is string => typeof x === "string" && x.length > 0);
  const sensor = j.sensor_data;
  const origin = sensor?.data_mode === "manual" ? "user-reported" : sensor?.data_mode === "live" ? "live" : "backend-simulated";
  const actualReading: SensorReading | null = sensor && typeof sensor.air_temperature_c === "number" && typeof sensor.air_relative_humidity_pct === "number" ? {
    timestamp: Date.parse(sensor.received_at_utc) || Date.now(), temperatureC: sensor.air_temperature_c,
    humidityPct: sensor.air_relative_humidity_pct, lightLux: null, distanceCm: sensor.ultrasonic_distance_cm ?? null,
    canopyHeightCm: sensor.canopy_height_proxy_cm ?? null, condition: reading?.condition ?? "sunny",
    origin,
  } : null;
  const env = rateEnvironment(actualReading, t);
  const recommendations = [j.harvest, j.watering, j.fertilizer].filter(Boolean);
  return {
    id: j.analysis_id ?? `backend-${Date.now().toString(36)}`, createdAt: Date.now(),
    source: "backend", provider: "FolLand backend", imageName: file.name,
    cropCondition: symptoms.length ? "attention" : "unknown", ripeness,
    confidence: null,
    symptoms: symptoms.length ? symptoms : ["Plant condition is not established by this check."],
    summary: String(v.observation_notes || "Review the report and supporting evidence."),
    suggestions: recommendations.map((card: {next_action: string}) => card.next_action).filter(Boolean),
    environment: env.rating, environmentNotes: env.notes,
    report: j.report, detector: j.detector, disagreement: j.disagreement, recommendations, analysisSensor: actualReading,
    analysisMeasurements: sensor ? { temperatureC: sensor.air_temperature_c ?? null, humidityPct: sensor.air_relative_humidity_pct ?? null, origin } : undefined,
  };
}
