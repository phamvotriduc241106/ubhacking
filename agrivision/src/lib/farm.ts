import type { HealthStatus, PlantState, Ripeness, SensorNode, SensorReading, WeatherCondition, ZoneId } from "./types";
import { clamp, hashString, lerp, mulberry32 } from "./utils";
import { zoneReading } from "./simulation";

export interface ZoneInfo {
  id: ZoneId;
  name: string;
  focus: string;
  growthRange: [number, number];
  center: [number, number];
}

export const ZONES: ZoneInfo[] = [
  { id: "A", name: "North Nursery", focus: "Seedlings & vegetative growth", growthRange: [0.25, 1.7], center: [-4, -4] },
  { id: "B", name: "East Bloom", focus: "Flowering & fruit set", growthRange: [1.8, 2.9], center: [4, -4] },
  { id: "C", name: "West Fruiting", focus: "Fruit development", growthRange: [2.9, 3.85], center: [-4, 4] },
  { id: "D", name: "South Harvest", focus: "Ripening & harvest", growthRange: [3.85, 5], center: [4, 4] },
];

export const PLANTS_PER_BED = 6;
export const BEDS_PER_ZONE = 2;
const BED_OFFSETS = [-1, 1];

export const SENSOR_NODES: SensorNode[] = ZONES.map((z) => ({
  id: `node-${z.id}`,
  zone: z.id,
  position: [z.center[0] + 3.2, 0, z.center[1]],
  label: `Sensor Node ${z.id}`,
}));

export const WEATHER_STATION_POS: [number, number, number] = [0, 0, 0];

export function plantHeightCm(growth: number) {
  return Math.round(6 + Math.pow(growth / 5, 0.85) * 150);
}

function ripenessFromGrowth(g: number): Ripeness | null {
  if (g < 3) return null;
  if (g < 3.8) return "unripe";
  if (g < 4.3) return "turning";
  if (g < 4.88) return "ripe";
  return "overripe";
}

interface LayoutPlant {
  id: string;
  zone: ZoneId;
  bed: number;
  index: number;
  position: [number, number, number];
  growth: number;
  seed: number;
}

/** Static farm layout, generated once. */
export const FARM_LAYOUT: LayoutPlant[] = (() => {
  const out: LayoutPlant[] = [];
  for (const z of ZONES) {
    const rand = mulberry32(hashString(z.id));
    for (let bed = 0; bed < BEDS_PER_ZONE; bed++) {
      for (let i = 0; i < PLANTS_PER_BED; i++) {
        const id = `${z.id}-${bed + 1}-${String(i + 1).padStart(2, "0")}`;
        const t = (bed * PLANTS_PER_BED + i) / (BEDS_PER_ZONE * PLANTS_PER_BED - 1);
        const growth = clamp(lerp(z.growthRange[0], z.growthRange[1], t) + (rand() - 0.5) * 0.25, 0.15, 5);
        const x = z.center[0] - 2.5 + i * 1.0 + (rand() - 0.5) * 0.08;
        const zPos = z.center[1] + BED_OFFSETS[bed] * 0.9;
        out.push({ id, zone: z.id, bed, index: i, position: [x, 0.18, zPos], growth, seed: hashString(id) });
      }
    }
  }
  return out;
})();

/** Derive each plant's condition from the layout, the selected weather and the latest reading. */
export function computePlants(reading: SensorReading | null, weather: WeatherCondition): PlantState[] {
  return FARM_LAYOUT.map((p) => {
    const rand = mulberry32(p.seed);
    const r = rand();
    const r2 = rand();
    const env = reading
      ? zoneReading(reading, p.zone)
      : { temperatureC: 23, humidityPct: 62, lightLux: 30000 };
    const leafTempC = +(env.temperatureC + (r2 - 0.5) * 1.2 + (weather === "sunny" ? 0.8 : 0)).toFixed(1);
    const localHumidityPct = +clamp(env.humidityPct + (r - 0.5) * 4, 0, 100).toFixed(1);

    const issues: string[] = [];
    let health: HealthStatus = "healthy";
    const raise = (h: HealthStatus) => {
      if (h === "stress" || (h === "attention" && health === "healthy")) health = h;
    };

    if (r < 0.07) {
      raise("attention");
      issues.push("Lower-leaf yellowing noted in demo scouting log");
    } else if (r > 0.965) {
      raise("stress");
      issues.push("Midday wilting noted in demo scouting log");
    }
    // Wet canopies raise fungal risk, but only some plants (dense foliage, poor airflow) get flagged.
    if (localHumidityPct > 86 && (r2 < 0.3 || (localHumidityPct > 94 && r2 < 0.45))) {
      raise("attention");
      issues.push("Canopy humidity elevated — fungal disease risk");
    }
    if (weather === "rainy" && (p.zone === "A" || p.zone === "C") && r2 < 0.35) {
      raise("attention");
      issues.push("Bed may be waterlogged after rain");
    }
    if (leafTempC > 31) {
      raise(p.growth > 1.8 && p.growth < 3.2 ? "stress" : "attention");
      issues.push("Heat may reduce flower pollination and fruit set");
    }
    if (weather === "cloudy" && p.growth > 3.5 && r2 > 0.8) {
      raise("attention");
      issues.push("Low light may slow ripening");
    }

    const ripeness = ripenessFromGrowth(p.growth);
    return {
      ...p,
      health,
      ripeness,
      ripenessPct: Math.round(clamp((p.growth - 3) / 1.9, 0, 1) * 100),
      heightCm: plantHeightCm(p.growth),
      leafTempC,
      localHumidityPct,
      issues,
    };
  });
}

export const HEALTH_META: Record<HealthStatus, { label: string; color: string; tw: string }> = {
  healthy: { label: "Healthy", color: "#22c55e", tw: "text-status-healthy" },
  attention: { label: "Needs Attention", color: "#eab308", tw: "text-status-attention" },
  stress: { label: "Potential Stress", color: "#ef4444", tw: "text-status-stress" },
};

export const RIPENESS_META: Record<Ripeness, { label: string; color: string }> = {
  unripe: { label: "Unripe", color: "#5c9a3c" },
  turning: { label: "Turning", color: "#e0a03a" },
  ripe: { label: "Ripe", color: "#d8382a" },
  overripe: { label: "Overripe", color: "#8f2418" },
};
