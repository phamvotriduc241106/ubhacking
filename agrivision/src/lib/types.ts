export type WeatherCondition = "sunny" | "cloudy" | "rainy";
export type HealthStatus = "healthy" | "attention" | "stress";
export type Ripeness = "unripe" | "turning" | "ripe" | "overripe";
export type DataMode = "demo" | "live";
export type ConnectionStatus = "demo" | "connecting" | "connected" | "error";
export type ZoneId = "A" | "B" | "C" | "D";

/**
 * Where a number came from. Every reading carries this so the UI can label it.
 * - simulated: generated in the browser by Demo Mode
 * - live: reported by a sensor endpoint that says it is live hardware
 * - backend-simulated: fetched from an API, but that API reports its data is simulated
 */
export type DataOrigin = "simulated" | "live" | "backend-simulated" | "manual" | "unavailable";

export interface SensorReading {
  timestamp: number;
  temperatureC: number;
  humidityPct: number;
  /** null when the source has no light sensor */
  lightLux: number | null;
  distanceCm: number | null;
  canopyHeightCm: number | null;
  condition: WeatherCondition;
  origin: DataOrigin;
}

export interface Thresholds {
  tempHighC: number;
  tempLowC: number;
  humidityHighPct: number;
  humidityHighHours: number;
  lightLowLux: number;
  growthStallCm: number;
  rainHeavyMm: number;
  frostC: number;
}

export interface PlantState {
  id: string;
  zone: ZoneId;
  bed: number;
  index: number;
  position: [number, number, number];
  /** 0 – 5 continuous: seedling → harvest */
  growth: number;
  health: HealthStatus;
  ripeness: Ripeness | null;
  ripenessPct: number;
  heightCm: number;
  leafTempC: number;
  localHumidityPct: number;
  issues: string[];
  seed: number;
}

export interface SensorNode {
  id: string;
  zone: ZoneId;
  position: [number, number, number];
  label: string;
}

export type AnalysisSource = "ai" | "demo" | "backend";
export type CropCondition = "healthy" | "attention" | "disease" | "unknown";
export type EnvironmentRating = "favorable" | "monitor" | "stressful";

export interface AnalysisResult {
  id: string;
  createdAt: number;
  source: AnalysisSource;
  provider: string;
  imageName: string;
  imageUrl?: string;
  cropCondition: CropCondition;
  ripeness: Ripeness | "unknown" | "not_applicable";
  confidence: { label: string; value: number | null } | null;
  symptoms: string[];
  summary: string;
  suggestions: string[];
  environment: EnvironmentRating;
  environmentNotes: string[];
  colorStats?: { red: number; orange: number; green: number; yellow: number; brown: number };
  report?: { source: string; text: string; gemini_status: string; model?: string | null; sections?: ReportSections | null } | null;
  reportMeta?: { crop: string; date: string; id: string };
  disagreement?: string | null;
  detector?: { status: string; message: string; width: number | null; height: number | null; counts: Record<string, number>; detections: Array<{ box: number[]; label: string; confidence: number; uncertain: boolean; raw_label: string }> } | null;
  recommendations?: Array<{ category: string; title: string; recommendation: string; next_action: string; limitations: string[]; references: Array<{ id: string; title: string; url: string }> }>;
  analysisSensor?: SensorReading | null;
}

export interface ReportSections {
  executive_summary: string; fruit_observation: string; leaf_observation: string; observation_source: string;
  harvest_status: string; harvest_recommendation: string; fruit_counts: Record<string, number> | null;
  air_temperature_c: number | null; air_humidity_pct: number | null; sensor_source: string; sensor_mode: string;
  weather_description: string | null; weather_temperature_c: number | null; weather_source: string; weather_mode: string;
  watering: string; watering_evidence: string[]; fertilizer: string; fertilizer_limitations: string[];
  next_actions: string[]; limitations: string[]; conclusion: string;
}

export interface WeatherDay {
  date: string;
  tMax: number;
  tMin: number;
  humidity: number;
  precipitation: number;
  code: number;
  isForecast: boolean;
}

export interface WeatherHour {
  time: string;
  temp: number;
  humidity: number;
  precipitation: number;
}

export interface WeatherData {
  source: "open-meteo" | "simulated";
  locationName: string;
  latitude: number;
  longitude: number;
  fetchedAt: number;
  /** Offset of the location's local time from UTC. Daily dates and hourly times are in local time. */
  utcOffsetSeconds: number;
  timezone: string;
  current: { temp: number | null; humidity: number | null; code: number | null; wind: number | null; precipitation: number | null; time: string | null };
  soil: { temperature: number | null; moisture: number | null; time: string | null };
  rain24: number | null;
  days: WeatherDay[];
  hours: WeatherHour[];
}
