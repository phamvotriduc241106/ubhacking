"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { motion } from "framer-motion";
import { ArrowRight, Droplets, LayoutDashboard, MousePointer2, Sun, Thermometer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SceneLoader } from "@/components/three/scene-fallback";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { WeatherSwitcher } from "@/components/shared/weather-switcher";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { usePlants } from "@/hooks/use-plants";
import { useApp } from "@/lib/store";
import { formatLux } from "@/lib/utils";

const FarmCanvas = dynamic(() => import("@/components/three/farm-canvas"), { ssr: false, loading: () => <SceneLoader /> });

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const {t} = useTranslation();
  const latest = useApp((s) => s.latest);
  const mode = useApp((s) => s.mode);
  const plants = usePlants();
  const healthy = plants.filter((p) => p.health === "healthy").length;

  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      <div className="absolute inset-0">
        <FarmCanvas variant="hero" />
      </div>
      {/* legibility gradients */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/35 to-transparent md:via-background/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/60 to-transparent" />

      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-center pb-40 sm:pb-0">
        <div className="container">
          <div className="max-w-[640px]">
            <motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease }} className="eyebrow pointer-events-auto backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {t("hero_badge")}
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease }}
              className="mt-5 text-balance text-[2.35rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
            >
              {t("hero_title")} <span className="text-gradient">{t("hero_subtitle")}</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease }} className="mt-5 max-w-xl text-pretty text-base text-foreground/75 sm:text-lg">
              {t("hero_description")}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.65, ease }} className="pointer-events-auto mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/farm">
                  {t("hero_explore")} <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="glass" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard /> {t("hero_dashboard")}
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* bottom HUD */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.9, ease }}
        className="absolute inset-x-0 bottom-5 z-10 sm:bottom-8"
      >
        <div className="container flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="glass grid grid-cols-4 gap-1 rounded-2xl p-1.5 sm:gap-2 sm:p-2">
            {[
              { icon: Thermometer, label: "Air", value: latest?.temperatureC ?? 0, unit: "°C", d: 1 },
              { icon: Droplets, label: "RH", value: latest?.humidityPct ?? 0, unit: "%", d: 0 },
              { icon: Sun, label: "Light", value: latest?.lightLux ?? 0, unit: "lux", d: 0, f: formatLux },
            ].map((m) => (
              <div key={m.label} className="flex min-w-0 flex-col rounded-xl px-2.5 py-1.5 sm:px-3.5">
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <m.icon className="h-3 w-3" /> <LocalizedText text={m.label} />
                </span>
                <span className="text-sm font-semibold sm:text-base">
                  <AnimatedNumber value={m.value} decimals={m.d} format={m.f} /> <span className="text-[10px] font-normal text-muted-foreground">{m.unit}</span>
                </span>
              </div>
            ))}
            <div className="flex min-w-0 flex-col rounded-xl px-2.5 py-1.5 sm:px-3.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground"><Localized id="ui_7f1e323b6272c620" fallback="Healthy" /></span>
              <span className="text-sm font-semibold sm:text-base">
                {healthy}
                <span className="text-[10px] font-normal text-muted-foreground">/{plants.length}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              <MousePointer2 className="h-3 w-3" />{" "}<Localized id="ui_33db6801ccbb5c57" fallback="Drag to orbit · click the scene, then scroll to zoom · tap hotspots" /></p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-[10px] font-semibold text-gold-500 backdrop-blur dark:text-gold-300">
                {mode === "demo" ? t("demo") : latest?.origin === "live" ? t("live") : "Simulated feed"}
              </span>
              <WeatherSwitcher />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
