"use client";

import { Activity, Droplets, Ruler, Sun, Thermometer } from "lucide-react";
import { CHART_COLORS } from "@/components/charts/chart-theme";
import { SensorChart } from "@/components/charts/sensor-chart";
import { OriginBadge } from "@/components/shared/origin-badge";
import { PageHeader } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { WeatherSwitcher } from "@/components/shared/weather-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/store";
import type { SensorReading } from "@/lib/types";
import { formatLux, formatTime } from "@/lib/utils";
import { CropHealthCard } from "./crop-health-card";
import { IntegrationPanel } from "./integration-panel";
import { MetricCard } from "./metric-card";
import { WeatherNowCard } from "./weather-now-card";

function deltaOver(history: SensorReading[], latest: SensorReading | null, key: keyof SensorReading, hours: number) {
  if (!latest || history.length < 2) return null;
  const target = latest.timestamp - hours * 3600000;
  const past = history.reduce<SensorReading | null>((best, r) => (Math.abs(r.timestamp - target) < Math.abs((best?.timestamp ?? 0) - target) ? r : best), null);
  const a = latest[key] as number | null;
  const b = past?.[key] as number | null | undefined;
  if (a == null || b == null || !past || Math.abs(past.timestamp - target) > 3600000) return null;
  return a - b;
}

export function SensorDashboard() {
  const latest = useApp((s) => s.latest);
  const history = useApp((s) => s.history);
  const recent = useApp((s) => s.recent);
  const thresholds = useApp((s) => s.thresholds);
  const mode = useApp((s) => s.mode);

  const series = [...history.slice(-36), ...recent.slice(-10)];
  const trend = (k: keyof SensorReading) => series.filter((r) => r[k] != null).map((r) => ({ v: r[k] as number }));

  const t = latest?.temperatureC ?? null;
  const h = latest?.humidityPct ?? null;
  const tempStatus = t == null ? undefined : t > thresholds.tempHighC ? { text: "High", tone: "bad" as const } : t < thresholds.tempLowC ? { text: "Low", tone: "warn" as const } : { text: "In range", tone: "good" as const };
  const humStatus = h == null ? undefined : h > thresholds.humidityHighPct ? { text: "Elevated", tone: "warn" as const } : h < 35 ? { text: "Dry", tone: "warn" as const } : { text: "Normal", tone: "good" as const };
  const l = latest?.lightLux ?? null;
  const hour = new Date().getHours();
  const lightStatus = l == null ? { text: "No sensor", tone: "neutral" as const } : hour < 6 || hour > 20 ? { text: "Night", tone: "neutral" as const } : l < thresholds.lightLowLux ? { text: "Low", tone: "warn" as const } : { text: "Good", tone: "good" as const };
  const dT = deltaOver(history, latest, "temperatureC", 1);
  const dH = deltaOver(history, latest, "humidityPct", 1);
  const dG = deltaOver(history, latest, "canopyHeightCm", 24) ?? deltaOver(history, latest, "canopyHeightCm", 12);

  return (
    <div>
      <PageHeader
        eyebrow="IoT telemetry"
        title={<>Sensor <span className="text-gradient">Dashboard</span></>}
        description="Microclimate readings from the field, refreshed every few seconds, with 24-hour history."
      >
        <div className="flex flex-wrap items-center gap-2">
          <OriginBadge origin={latest?.origin} />
          <WeatherSwitcher compact={false} />
        </div>
      </PageHeader>

      <div className="container mt-10 space-y-4">
        {mode === "demo" && (
          <Reveal className="flex items-center gap-3 rounded-2xl border border-gold-500/30 bg-gold-400/10 px-4 py-3 text-sm">
            <span className="rounded-full bg-gold-400/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-500 dark:text-gold-300">Demo Mode</span>
            <span className="text-foreground/80">All readings on this page are simulated. Connect a real sensor in the Data source panel below.</span>
          </Reveal>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard icon={Thermometer} label="Air Temperature" value={t} unit="°C" color={CHART_COLORS.temp} trend={trend("temperatureC")} status={tempStatus} delta={dT == null ? null : { value: dT, unit: " °C", label: "vs 1 h ago" }} index={0} />
          <MetricCard icon={Droplets} label="Relative Humidity" value={h} unit="%" decimals={0} color={CHART_COLORS.humidity} trend={trend("humidityPct")} status={humStatus} delta={dH == null ? null : { value: dH, unit: " pts", label: "vs 1 h ago" }} index={1} />
          <MetricCard icon={Sun} label="Light Intensity" value={l} unit="lux" format={formatLux} color={CHART_COLORS.light} trend={trend("lightLux")} status={lightStatus} index={2} footer="Peak full sun ≈ 60–100k lux outdoors" />
          <MetricCard
            icon={Ruler}
            label="Canopy Height"
            value={latest?.canopyHeightCm ?? null}
            unit="cm"
            color={CHART_COLORS.growth}
            trend={trend("canopyHeightCm")}
            delta={dG == null ? null : { value: dG, unit: " cm", label: "growth over the period" }}
            footer={latest?.distanceCm != null ? `Ultrasonic sensor → canopy: ${latest.distanceCm.toFixed(1)} cm (mounted at 50 cm)` : "Distance sensor not reporting"}
            index={3}
          />
          <WeatherNowCard index={4} />
          <CropHealthCard index={5} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Environmental trends</CardTitle>
                <CardDescription>Temperature, humidity and light over time. Toggle series and range.</CardDescription>
              </div>
              {latest && <span className="text-xs text-muted-foreground">Last reading {formatTime(latest.timestamp)}</span>}
            </div>
          </CardHeader>
          <CardContent>
            <SensorChart history={history.length ? history : recent} height={340} />
          </CardContent>
        </Card>

        <IntegrationPanel />
      </div>
    </div>
  );
}
