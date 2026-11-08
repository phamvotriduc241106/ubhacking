import type { Alert, AnalysisResult, EvidenceKind, SensorReading, Thresholds, WeatherData } from "./types";
import { formatLux, round } from "./utils";
import { locationNow } from "./weather";

function sensorKind(r: SensorReading): EvidenceKind {
  return r.origin === "live" ? "sensor-live" : r.origin === "manual" ? "sensor-manual" : r.origin === "unavailable" ? "sensor-unavailable" : r.origin === "backend-simulated" ? "sensor-backend-simulated" : "sensor-simulated";
}

/** Hours (from the most recent reading backwards) that a predicate has held continuously. */
function trailingHours(history: SensorReading[], pred: (r: SensorReading) => boolean) {
  let i = history.length - 1;
  while (i >= 0 && pred(history[i])) i--;
  if (i === history.length - 1) return 0;
  const first = history[i + 1];
  const last = history[history.length - 1];
  return (last.timestamp - first.timestamp) / 3600000 + 1 / 6;
}

export interface RecommendationInput {
  latest: SensorReading | null;
  history: SensorReading[];
  weather: WeatherData | null;
  analysis: AnalysisResult | null;
  thresholds: Thresholds;
}

export function buildAlerts({ latest, history, weather, analysis, thresholds: t }: RecommendationInput): Alert[] {
  const alerts: Alert[] = [];

  if (latest) {
    const kind = sensorKind(latest);
    if (latest.temperatureC > t.tempHighC) {
      const hot = trailingHours(history, (r) => r.temperatureC > t.tempHighC);
      alerts.push({
        id: "temp-high",
        severity: latest.temperatureC > t.tempHighC + 4 ? "critical" : "warning",
        category: "temperature",
        title: "High temperature detected",
        message: `Air temperature is ${round(latest.temperatureC)} °C, above your ${t.tempHighC} °C limit${hot > 0.5 ? ` for about ${round(hot)} h` : ""}. Check irrigation and ventilation.`,
        action: "Water early, open vents or add shade cloth during the hottest hours.",
        evidence: [{ kind, detail: `Air temperature ${round(latest.temperatureC)} °C` }],
      });
    } else if (latest.temperatureC < t.tempLowC) {
      alerts.push({
        id: "temp-low",
        severity: "warning",
        category: "temperature",
        title: "Low temperature detected",
        message: `Air temperature is ${round(latest.temperatureC)} °C, below your ${t.tempLowC} °C limit. Cold nights can slow growth and reduce fruit set.`,
        action: "Close vents in the evening or use row cover overnight.",
        evidence: [{ kind, detail: `Air temperature ${round(latest.temperatureC)} °C` }],
      });
    }

    const humidHours = trailingHours(history, (r) => r.humidityPct > t.humidityHighPct);
    if (humidHours >= t.humidityHighHours) {
      alerts.push({
        id: "humidity-sustained",
        severity: humidHours >= t.humidityHighHours * 2 ? "critical" : "warning",
        category: "humidity",
        title: "Humidity has remained elevated",
        message: `Relative humidity has stayed above ${t.humidityHighPct}% for about ${round(humidHours)} h. Monitor for fungal disease risk.`,
        action: "Improve airflow, water at the base in the morning, and scout lower leaves for spots.",
        evidence: [{ kind, detail: `Currently ${round(latest.humidityPct)}% RH; ${round(humidHours)} h above limit` }],
      });
    } else if (latest.humidityPct > t.humidityHighPct) {
      alerts.push({
        id: "humidity-high",
        severity: "info",
        category: "humidity",
        title: "Humidity is above your limit",
        message: `Relative humidity is ${round(latest.humidityPct)}%. Not yet sustained for ${t.humidityHighHours} h.`,
        action: "Keep an eye on it; ventilate if it persists.",
        evidence: [{ kind, detail: `Currently ${round(latest.humidityPct)}% RH` }],
      });
    }

    const daylight = history.filter((r) => {
      const h = new Date(r.timestamp).getHours();
      return h >= 8 && h <= 17 && r.lightLux != null;
    });
    if (latest.lightLux == null) {
      alerts.push({
        id: "light-missing",
        severity: "info",
        category: "light",
        title: "No light sensor reported",
        message: "The connected source does not report light intensity, so light alerts are disabled.",
        action: "Add a light sensor (for example a BH1750) to enable light monitoring.",
        evidence: [{ kind, detail: "lightLux missing from payload" }],
      });
    } else if (daylight.length >= 6) {
      const avg = daylight.reduce((s, r) => s + (r.lightLux ?? 0), 0) / daylight.length;
      if (avg < t.lightLowLux) {
        alerts.push({
          id: "light-low",
          severity: "warning",
          category: "light",
          title: "Low ambient light recorded",
          message: `Average daytime light during the monitoring period was ${formatLux(avg)} lux, below your ${formatLux(t.lightLowLux)} lux limit.`,
          action: "Prune crowding foliage, clean greenhouse covers, or consider supplemental lighting.",
          evidence: [{ kind, detail: `Mean of ${daylight.length} daytime readings` }],
        });
      }
    }

    const withCanopy = history.filter((r) => r.canopyHeightCm != null);
    if (withCanopy.length > 1) {
      const span = (withCanopy[withCanopy.length - 1].timestamp - withCanopy[0].timestamp) / 3600000;
      const gained = (withCanopy[withCanopy.length - 1].canopyHeightCm ?? 0) - (withCanopy[0].canopyHeightCm ?? 0);
      if (span >= 12 && gained < t.growthStallCm) {
        alerts.push({
          id: "growth-slow",
          severity: "info",
          category: "growth",
          title: "Canopy growth is slower than expected",
          message: `The canopy gained ${round(gained)} cm over ${round(span, 0)} h, below your ${t.growthStallCm} cm limit. Distance readings can also change when plants are pruned or tied.`,
          action: "Check watering, nutrition and whether the sensor view is blocked.",
          evidence: [{ kind, detail: `Ultrasonic canopy proxy, ${withCanopy.length} readings` }],
        });
      }
    }
  }

  if (weather) {
    const wKind: EvidenceKind = weather.source === "simulated" ? "weather-simulated" : "weather-forecast";
    const hKind: EvidenceKind = weather.source === "simulated" ? "weather-simulated" : "weather-historical";
    const nowIso = locationNow(weather).hour;
    const next24 = weather.hours.filter((h) => h.time >= nowIso).slice(0, 24);
    const rain24 = next24.reduce((s, h) => s + h.precipitation, 0);
    if (rain24 > t.rainHeavyMm) {
      alerts.push({
        id: "rain-heavy",
        severity: "warning",
        category: "weather",
        title: "Heavy rain forecast",
        message: `About ${round(rain24)} mm of rain is forecast in the next 24 h for ${weather.locationName}.`,
        action: "Pause scheduled irrigation, check drainage, and harvest ripe fruit to limit cracking.",
        evidence: [{ kind: wKind, detail: `Hourly precipitation forecast, ${weather.locationName}` }],
      });
    }
    const forecast = weather.days.filter((d) => d.isForecast).slice(0, 3);
    const coldest = forecast.reduce((m, d) => Math.min(m, d.tMin), Infinity);
    if (coldest < t.frostC) {
      alerts.push({
        id: "cold-forecast",
        severity: coldest <= 0 ? "critical" : "warning",
        category: "weather",
        title: "Cold night forecast",
        message: `A minimum of ${round(coldest)} °C is forecast within 3 days.`,
        action: "Prepare frost cloth and harvest mature-green fruit if frost is likely.",
        evidence: [{ kind: wKind, detail: "3-day minimum temperature forecast" }],
      });
    }
    const hottest = forecast.reduce((m, d) => Math.max(m, d.tMax), -Infinity);
    if (hottest > t.tempHighC + 2) {
      alerts.push({
        id: "heat-forecast",
        severity: "warning",
        category: "weather",
        title: "Heat forecast",
        message: `Highs up to ${round(hottest)} °C are forecast. Fruit set drops when days exceed about 32 °C.`,
        action: "Plan deeper morning irrigation and shade for flowering beds.",
        evidence: [{ kind: wKind, detail: "3-day maximum temperature forecast" }],
      });
    }
    const past7 = weather.days.filter((d) => !d.isForecast).slice(-7);
    const rain7 = past7.reduce((s, d) => s + d.precipitation, 0);
    if (past7.length >= 5 && rain7 < 5) {
      alerts.push({
        id: "dry-week",
        severity: "info",
        category: "weather",
        title: "Dry week",
        message: `Only ${round(rain7)} mm of rain fell in the last 7 days. Soil moisture is not measured by these sensors.`,
        action: "Check soil moisture by hand at 5–10 cm depth before watering.",
        evidence: [{ kind: hKind, detail: "7-day precipitation history" }],
      });
    }
  }

  if (analysis) {
    const kind: EvidenceKind = analysis.source === "ai" ? "camera-ai" : "camera-demo";
    const via = analysis.source === "ai" ? analysis.provider : "demo color heuristic (not AI)";
    if (analysis.ripeness === "turning" || analysis.ripeness === "ripe") {
      alerts.push({
        id: "camera-ripening",
        severity: "info",
        category: "camera",
        title: "Ripening may have begun",
        message: "Visible fruit color suggests the ripening stage may have begun.",
        action: analysis.ripeness === "ripe" ? "Harvest fully colored fruit within a few days." : "Pick at breaker stage to ripen indoors if pests or rain threaten.",
        evidence: [{ kind, detail: `Photo "${analysis.imageName}" via ${via}` }],
      });
    }
    if (analysis.ripeness === "overripe") {
      alerts.push({
        id: "camera-overripe",
        severity: "warning",
        category: "camera",
        title: "Fruit may be overripe",
        message: "Dark or softening color was observed in the photo.",
        action: "Harvest promptly and remove damaged fruit to avoid attracting pests.",
        evidence: [{ kind, detail: `Photo "${analysis.imageName}" via ${via}` }],
      });
    }
    if (analysis.cropCondition !== "healthy") {
      alerts.push({
        id: "camera-condition",
        severity: analysis.cropCondition === "disease" ? "warning" : "info",
        category: "camera",
        title: analysis.cropCondition === "disease" ? "Possible disease symptoms visible" : "Foliage needs attention",
        message: `${analysis.symptoms.slice(0, 2).join("; ") || "Unusual coloring observed"}. Visual symptoms alone do not confirm a disease or deficiency.`,
        action: "Inspect the plant closely and compare with an extension-service guide before treating.",
        evidence: [{ kind, detail: `Photo "${analysis.imageName}" via ${via}` }],
      });
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export const EVIDENCE_LABEL: Record<EvidenceKind, { label: string; real: boolean }> = {
  "sensor-simulated": { label: "Simulated sensor", real: false },
  "sensor-backend-simulated": { label: "Backend simulated sensor", real: false },
  "sensor-live": { label: "Live sensor", real: true },
  "sensor-manual": { label: "User-reported reading", real: true },
  "sensor-unavailable": { label: "Sensor source unavailable", real: false },
  "weather-historical": { label: "Weather history", real: true },
  "weather-forecast": { label: "Weather forecast", real: true },
  "weather-simulated": { label: "Simulated weather", real: false },
  "camera-ai": { label: "Camera · AI model", real: true },
  "camera-demo": { label: "Camera · demo heuristic", real: false },
};
