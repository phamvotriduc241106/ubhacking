"use client";

import { Localized } from "@/i18n/localized";
import { Droplets, Sun, Thermometer } from "lucide-react";
import Link from "next/link";
import { CHART_COLORS } from "@/components/charts/chart-theme";
import { SensorChart } from "@/components/charts/sensor-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { OriginBadge } from "@/components/shared/origin-badge";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { formatLux } from "@/lib/utils";

export function LivePreview() {
  const latest = useApp((s) => s.latest);
  const history = useApp((s) => s.history);
  const recent = useApp((s) => s.recent);
  const trend = (k: "temperatureC" | "humidityPct" | "lightLux") => [...history.slice(-30), ...recent.slice(-8)].map((r) => ({ v: (r[k] as number) ?? 0 }));
  return (
    <section className="container py-12">
      <SectionHeading
        eyebrow="Live telemetry"
        title={<><Localized id="ui_f7d972c2c5918709" fallback="Your field," />{" "}<span className="text-gradient"><Localized id="ui_6d587a489b7cac2a" fallback="breathing in real time." /></span></>}
        description="Readings update every few seconds. In Demo Mode they come from a realistic simulation, and every number is labeled with its source."
      >
        <div className="flex items-center gap-3">
          <OriginBadge origin={latest?.origin} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard"><Localized id="ui_00519f8c9af014cb" fallback="Open full dashboard →" /></Link>
          </Button>
        </div>
      </SectionHeading>
      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <MetricCard icon={Thermometer} label="Air Temperature" value={latest?.temperatureC ?? null} unit="°C" color={CHART_COLORS.temp} trend={trend("temperatureC")} index={0} />
        <MetricCard icon={Droplets} label="Relative Humidity" value={latest?.humidityPct ?? null} unit="%" decimals={0} color={CHART_COLORS.humidity} trend={trend("humidityPct")} index={1} />
        <MetricCard icon={Sun} label="Light Intensity" value={latest?.lightLux ?? null} unit="lux" format={formatLux} color={CHART_COLORS.light} trend={trend("lightLux")} index={2} />
      </div>
      <Reveal className="glass mt-4 rounded-3xl p-5 sm:p-6">
        <SensorChart history={history} height={260} />
      </Reveal>
    </section>
  );
}
