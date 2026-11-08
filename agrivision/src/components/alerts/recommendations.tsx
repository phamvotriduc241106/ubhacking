"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, AlertTriangle, Camera, CheckCircle2, CloudSun, Droplets, Info, RotateCcw, Sprout, Sun, Thermometer } from "lucide-react";
import Link from "next/link";
import { EvidenceBadge, OriginBadge } from "@/components/shared/origin-badge";
import { PageHeader } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useAlerts } from "@/hooks/use-alerts";
import { useWeather } from "@/hooks/use-weather";
import { useApp } from "@/lib/store";
import { THRESHOLD_FIELDS } from "@/lib/thresholds";
import type { Alert } from "@/lib/types";
import { cn, formatLux } from "@/lib/utils";

const CAT_ICON: Record<Alert["category"], typeof Sun> = {
  temperature: Thermometer,
  humidity: Droplets,
  light: Sun,
  growth: Sprout,
  weather: CloudSun,
  camera: Camera,
};

const SEV = {
  critical: { icon: AlertOctagon, cls: "border-red-500/40 bg-red-500/[0.07]", badge: "critical" as const, label: "Critical" },
  warning: { icon: AlertTriangle, cls: "border-yellow-500/40 bg-yellow-500/[0.07]", badge: "warning" as const, label: "Warning" },
  info: { icon: Info, cls: "border-border bg-foreground/[0.02]", badge: "outline" as const, label: "Info" },
};

export function Recommendations() {
  useWeather();
  const alerts = useAlerts();
  const thresholds = useApp((s) => s.thresholds);
  const setThreshold = useApp((s) => s.setThreshold);
  const reset = useApp((s) => s.resetThresholds);
  const latest = useApp((s) => s.latest);
  const weather = useApp((s) => s.weatherData);
  const analysis = useApp((s) => s.lastAnalysis);

  const counts = { critical: 0, warning: 0, info: 0 };
  alerts.forEach((a) => counts[a.severity]++);

  return (
    <div>
      <PageHeader
        eyebrow="Decision support"
        title={<><Localized id="ui_9e6ad6db21dbc4cc" fallback="Smart" />{" "}<span className="text-gradient"><Localized id="ui_0738ee00b61bc3af" fallback="Recommendations" /></span></>}
        description="Camera observations, sensor measurements and weather history fused into prioritized actions. Every alert shows whether its evidence is real or simulated."
      />
      <div className="container mt-10 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(["critical", "warning", "info"] as const).map((s) => (
              <div key={s} className="glass rounded-2xl p-4">
                <p className="text-xs text-muted-foreground"><LocalizedText text={SEV[s].label} /></p>
                <p className="num font-display text-3xl font-semibold">{counts[s]}</p>
              </div>
            ))}
          </div>
          <div className="glass flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-xs">
            <span className="font-semibold text-muted-foreground"><Localized id="ui_3cac211e44694f0d" fallback="Evidence sources:" /></span>
            <OriginBadge origin={latest?.origin} />
            <Badge variant={weather?.source === "open-meteo" ? "live" : "demo"}>{weather ? (weather.source === "open-meteo" ? "● Open-Meteo weather" : "◌ Simulated weather") : "Weather loading"}</Badge>
            <Badge variant={analysis ? (analysis.source === "ai" ? "live" : "demo") : "outline"}>
              {analysis ? (analysis.source === "ai" ? "● Camera · AI" : "◌ Camera · demo heuristic") : "No photo analyzed"}
            </Badge>
            {!analysis && <Link href="/analysis" className="font-medium text-primary hover:underline"><Localized id="ui_66758fd0c977eaf8" fallback="Add a photo →" /></Link>}
          </div>
          <AnimatePresence initial={false}>
            {alerts.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass flex items-center gap-3 rounded-3xl p-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="font-semibold"><Localized id="ui_96ed94a7e3ac84bf" fallback="All clear" /></p>
                  <p className="text-sm text-muted-foreground"><Localized id="ui_dda747f9f0d00bfb" fallback="No readings are outside your thresholds right now." /></p>
                </div>
              </motion.div>
            )}
            {alerts.map((a) => {
              const S = SEV[a.severity];
              const Cat = CAT_ICON[a.category];
              return (
                <motion.article
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35 }}
                  className={cn("glass rounded-3xl border p-5", S.cls)}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-foreground/[0.06]"><Cat className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold"><LocalizedText text={a.title} /></h3>
                        <Badge variant={S.badge}><S.icon className="h-3 w-3" /> <LocalizedText text={S.label} /></Badge>
                      </div>
                      <p className="mt-1 text-sm text-foreground/80"><LocalizedText text={a.message} /></p>
                      <p className="mt-2 rounded-xl bg-primary/[0.08] px-3 py-2 text-sm"><span className="font-semibold text-primary"><Localized id="ui_7d9fda4ea8538475" fallback="Action:" /></span> <LocalizedText text={a.action} /></p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {a.evidence.map((e) => (
                          <span key={e.detail} className="flex items-center gap-1.5">
                            <EvidenceBadge kind={e.kind} />
                            <span className="text-[11px] text-muted-foreground">{e.detail}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle><Localized id="ui_69a34f34a6711b2d" fallback="Alert thresholds" /></CardTitle>
                <CardDescription><Localized id="ui_fdfe68a05bc1a08e" fallback="Adjust to your variety and site. Saved in this browser." /></CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}><RotateCcw />{" "}<Localized id="ui_daee7606b339f3c3" fallback="Reset" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {THRESHOLD_FIELDS.map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor={f.key} className="font-medium"><LocalizedText text={f.label} /></label>
                  <span className="num rounded-lg bg-foreground/5 px-2 py-0.5 text-xs font-semibold">
                    {f.unit === "lux" ? formatLux(thresholds[f.key]) : thresholds[f.key]} {f.unit}
                  </span>
                </div>
                <Slider id={f.key} className="mt-1.5" min={f.min} max={f.max} step={f.step} value={[thresholds[f.key]]} onValueChange={([v]) => setThreshold(f.key, v)} aria-label={f.label} />
                <p className="text-[11px] text-muted-foreground">{f.help}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
