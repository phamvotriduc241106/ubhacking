"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { motion } from "framer-motion";
import { CloudSun, Wind } from "lucide-react";
import Link from "next/link";
import { WeatherIcon } from "@/components/shared/weather-icon";
import { useWeather } from "@/hooks/use-weather";
import { describeCode } from "@/lib/weather";

export function WeatherNowCard({ index = 0 }: { index?: number }) {
  const { data, loading } = useWeather();
  const d = data ? describeCode(data.current.code) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="glass relative flex min-h-[188px] flex-col overflow-hidden rounded-3xl p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/15 text-sky-500">
            <CloudSun className="h-[18px] w-[18px]" />
          </span>
          <span className="text-sm font-medium text-muted-foreground"><Localized id="ui_d4ebb9ed2614a4b9" fallback="Weather Conditions" /></span>
        </div>
        {data && (
          <span className={data.source === "open-meteo" ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300" : "rounded-full bg-gold-400/15 px-2 py-0.5 text-[10px] font-semibold text-gold-500"}>
            {data.source === "open-meteo" ? "Open-Meteo" : "Simulated"}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <WeatherIcon kind={d?.kind ?? "partly"} className="h-14 w-14" />
        <div>
          {loading && !data ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-foreground/10" />
          ) : (
            <p className="font-display text-4xl font-semibold">
              {data?.current.temp != null ? data.current.temp.toFixed(0) : "—"}
              <span className="text-base font-normal text-muted-foreground">°C</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">{d?.label ?? "Loading"} · {data?.locationName}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-muted-foreground">
        <span>Weather data: Open-Meteo</span>
        {data && (
          <span className="flex items-center gap-1">
            <Wind className="h-3 w-3" /> {data.current.wind != null ? `${data.current.wind.toFixed(0)} km/h` : "Wind unavailable"}
          </span>
        )}
      </div>
      <Link href="/weather" className="mt-2 text-[11px] font-medium text-primary hover:underline"><Localized id="ui_eaf809f31ee96e98" fallback="Weather intelligence →" /></Link>
    </motion.div>
  );
}
