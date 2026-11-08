"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { AnimatePresence, motion } from "framer-motion";
import { Bug, Droplets, FlaskConical, Pause, Play, Sun, Thermometer, Wind } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/section-heading";
import { SceneLoader } from "@/components/three/scene-fallback";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { GROWTH_STAGES } from "@/lib/growth";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const GrowthCanvas = dynamic(() => import("@/components/three/growth-canvas"), { ssr: false, loading: () => <SceneLoader /> });

/** Growth value at the center of each stage, and the boundaries between stages. */
const ANCHORS = [0.4, 1.2, 2.1, 3.0, 4.0, 4.8];
const BOUNDS = [0.8, 1.65, 2.55, 3.5, 4.45];
const stageOf = (g: number) => BOUNDS.filter((b) => g >= b).length;

export function GrowthTimeline() {
  const [g, setG] = useState(ANCHORS[2]);
  const [playing, setPlaying] = useState(false);
  const latest = useApp((s) => s.latest);
  const idx = stageOf(g);
  const stage = GROWTH_STAGES[idx];

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setG((v) => {
        const n = v + 0.025;
        if (n >= 5) {
          setPlaying(false);
          return 5;
        }
        return n;
      });
    }, 60);
    return () => window.clearInterval(id);
  }, [playing]);

  const reqs = [
    { icon: Thermometer, label: "Temperature", v: stage.temperature },
    { icon: Wind, label: "Humidity", v: stage.humidity },
    { icon: Sun, label: "Light", v: stage.light },
    { icon: Droplets, label: "Water", v: stage.water },
    { icon: FlaskConical, label: "Nutrients", v: stage.nutrients },
    { icon: Bug, label: "Watch for", v: stage.watchFor },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="3D growth visualization"
        title={<><Localized id="ui_5e4562b50b0543ea" fallback="From seed to" />{" "}<span className="text-gradient"><Localized id="ui_d42fdd6b64213788" fallback="harvest." /></span></>}
        description="Drag the timeline to grow a procedurally generated tomato plant and learn what it needs at each stage."
      />
      <div className="container mt-10 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative h-[56vh] min-h-[420px] overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-sage-200/40 via-transparent to-forest-700/10 dark:from-forest-800/60 dark:via-forest-950 dark:to-black">
          <GrowthCanvas growth={g} />
          <div className="pointer-events-none absolute left-4 top-4">
            <AnimatePresence mode="wait">
              <motion.div key={stage.key} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="glass rounded-2xl px-4 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground"><Localized id="ui_de838855e4a6e04e" fallback="Stage" />{" "}{idx + 1} / 6</p>
                <p className="font-display text-xl font-semibold"><LocalizedText text={stage.name} /></p>
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="pointer-events-none absolute bottom-3 right-4 text-[11px] text-muted-foreground"><Localized id="ui_689953014bff9589" fallback="Drag to rotate · scroll to zoom" /></p>
        </div>

        <div className="glass flex flex-col rounded-3xl p-6">
          <AnimatePresence mode="wait">
            <motion.div key={stage.key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.35 }} className="flex flex-1 flex-col">
              <p className="text-sm font-medium text-primary"><LocalizedText text={stage.days} /></p>
              <h3 className="mt-1 text-3xl font-semibold"><LocalizedText text={stage.name} /></h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground"><LocalizedText text={stage.summary} /></p>
              <dl className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {reqs.map((r) => (
                  <div key={r.label} className="rounded-2xl bg-foreground/[0.04] p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><r.icon className="h-3.5 w-3.5" /> <LocalizedText text={r.label} /></dt>
                    <dd className="mt-1 text-sm"><LocalizedText text={r.v} /></dd>
                  </div>
                ))}
              </dl>
              {latest && (
                <p className="mt-4 text-xs text-muted-foreground"><Localized id="ui_a5ed38f83ca9c447" fallback="Field right now:" />{" "}{latest.temperatureC.toFixed(1)} °C, {latest.humidityPct.toFixed(0)}<Localized id="ui_50c3a5aff1e271dd" fallback="% RH (" />{latest.origin === "live" ? "live" : "simulated"}).
                </p>
              )}
              <p className="mt-auto pt-4 text-[11px] text-muted-foreground"><Localized id="ui_af27d2a64bd5566c" fallback="Typical ranges for tomatoes; they vary by variety, climate and growing system." /></p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="container mt-4">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => {
                if (g >= 5) setG(0.1);
                setPlaying((p) => !p);
              }}
              aria-label={playing ? "Pause growth animation" : "Play growth animation"}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            <div className="flex-1">
              <Slider value={[g]} min={0.05} max={5} step={0.01} onValueChange={([v]) => { setPlaying(false); setG(v); }} aria-label="Growth timeline" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {GROWTH_STAGES.map((s, i) => (
              <button
                key={s.key}
                onClick={() => { setPlaying(false); setG(ANCHORS[i]); }}
                className={cn("relative rounded-2xl px-3 py-2.5 text-left transition-all", i === idx ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-foreground/5")}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><LocalizedText text={s.days} /></span>
                <span className={cn("block text-sm font-semibold", i === idx ? "text-primary" : "")}><LocalizedText text={s.name} /></span>
                {i < GROWTH_STAGES.length - 1 && <span className="absolute -right-1.5 top-1/2 hidden -translate-y-1/2 text-muted-foreground sm:block">→</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
