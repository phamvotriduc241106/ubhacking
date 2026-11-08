export type EvidenceType =
  | 'SIMULATED'
  | 'USER_REPORTED'
  | 'WEATHER_FORECAST'
  | 'NOT_MEASURED'
  | 'OBSERVED'
  | 'PREDICTED';

export interface SensorReading {
  source: string;
  data_mode: 'simulated' | 'live' | 'manual' | 'unavailable';
  received_at_utc: string;
  fresh: boolean;
  air_temperature_c: number | null;
  air_relative_humidity_pct: number | null;
  ultrasonic_distance_cm: number | null;
  canopy_height_proxy_cm: number | null;
  status: string;
  notes?: string | null;
}

export interface WeatherSummary {
  location_name: string;
  latitude: number;
  longitude: number;
  temperature_c: number | null;
  relative_humidity_pct: number | null;
  rain_last_24h_mm: number | null;
  rain_next_24h_mm: number | null;
  precipitation_sum_7d_mm: number | null;
  weather_description: string | null;
  source: string;
  retrieved_at_utc: string;
  is_fallback: boolean;
}

export interface VisualObservation {
  photo_uploaded: boolean;
  filename: string | null;
  file_size_kb: number | null;
  content_type: string | null;
  maturity_stage: 'green' | 'turning' | 'red' | 'uncertain' | 'unavailable' | null;
  stage_label: string;
  visual_confidence: 'high' | 'medium' | 'low' | 'none';
  is_simulated: boolean;
  ai_provider?: string | null;
  detected_plant?: string | null;
  detected_leaf_color?: string | null;
  detected_leaf_symptoms?: string | null;
  leaf_condition_summary?: string | null;
  ai_multimodal_synthesis?: string | null;
  observation_notes: string;
}

export interface EvidenceItem {
  type: EvidenceType;
  label: string;
  detail: string;
}

export interface ReferenceItem {
  id: string;
  title: string;
  organization: string;
  url: string;
  relevance: string;
}

export interface RecommendationCardData {
  category: 'harvest' | 'watering' | 'fertilizer';
  status: string;
  title: string;
  recommendation: string;
  evidence: EvidenceItem[];
  limitations: string[];
  next_action: string;
  references: ReferenceItem[];
}

export interface AnalysisResponse {
  analysis_id: string;
  timestamp_utc: string;
  crop: string;
  variety: string | null;
  harvest_goal: string;
  soil_condition: string;
  leaf_symptoms: string | null;
  visual_observations: VisualObservation;
  sensor_data: SensorReading;
  weather_data: WeatherSummary;
  harvest: RecommendationCardData;
  watering: RecommendationCardData;
  fertilizer: RecommendationCardData;
  detector?: {status: string; message: string; width: number | null; height: number | null; counts: Record<string, number>; detections: Array<{box: number[]; label: string; confidence: number; uncertain: boolean; raw_label: string; rotten_check_probability: number | null}>};
  disagreement?: string | null;
  report?: {source: 'gemini' | 'deterministic'; text: string; gemini_status: string} | null;
  scientific_summary: string;
}

export interface HealthCheckResponse {
  status: string;
  app: string;
  version: string;
  sensor_mode: string;
  supported_crops: string[];
  hardware_target: string;
}
