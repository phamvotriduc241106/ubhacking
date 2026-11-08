"use client";

import { CloudRain, Droplets, LocateFixed, MapPin, RefreshCw, Wind } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { WeatherIcon } from "@/components/shared/weather-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWeather } from "@/hooks/use-weather";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { describeCode, LOCATIONS, locationNow } from "@/lib/weather";
import { WeatherBackdrop } from "./weather-backdrop";
import { WeatherCharts } from "./lazy-weather-charts";

const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });

export function WeatherIntel() {
  const { data, loading, error, reload } = useWeather();
  const location = useApp((s) => s.location);
  const setLocation = useApp((s) => s.setLocation);
  const thresholds = useApp((s) => s.thresholds);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const today = data ? locationNow(data).date : new Date().toISOString().slice(0, 10);
  const daily = useMemo(
    () =>
      (data?.days ?? []).map((d) => ({
        ...d,
        label: shortDay(d.date),
        range: [d.tMin, d.tMax] as [number, number],
        gdd: Math.max(0, (Math.min(d.tMax, 30) + Math.max(d.tMin, 10)) / 2 - 10),
      })),
    [data],
  );
  const withCum = useMemo(() => {
    let c = 0;
    return daily.filter((d) => !d.isForecast).map((d) => ({ ...d, cum: +(c += d.gdd).toFixed(1) }));
  }, [daily]);
  const humidity = useMemo(() => {
    if (!data) return [];
    const cutoff = locationNow(data, -7 * 86400000).hour;
    const now = locationNow(data).hour;
    return data.hours.filter((h) => h.time >= cutoff && h.time <= now).filter((_, i) => i % 2 === 0).map((h) => ({ t: h.time, humidity: h.humidity, temp: h.temp }));
  }, [data]);
  const forecast = daily.filter((d) => d.date >= today).slice(0, 7);
  const past = daily.filter((d) => !d.isForecast);
  const rain14 = past.reduce((s, d) => s + d.precipitation, 0);
  const avgHigh = past.length ? past.reduce((s, d) => s + d.tMax, 0) / past.length : 0;
  const humidDays = past.filter((d) => d.humidity > 80).length;
  const now = data ? describeCode(data.current.code) : null;

  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeoMsg("Geolocation is not available in this browser.");
    setGeoMsg("Locating…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ name: "My field", latitude: +p.coords.latitude.toFixed(3), longitude: +p.coords.longitude.toFixed(3) });
        setGeoMsg(null);
      },
      () => setGeoMsg("Location permission was denied."),
      { timeout: 8000 },
    );
  };

  return (
    <div>
      <PageHeader eyebrow="Weather intelligence" title={<>Field <span className="text-gradient">Weather Intelligence</span></>} description="Two weeks of weather history and a 7-day forecast, translated into growing conditions for tomatoes.">
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass flex items-center gap-2 rounded-full py-1 pl-3 pr-1">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <select
              aria-label="Location"
              value={LOCATIONS.some((l) => l.name === location.name) ? location.name : "custom"}
              onChange={(e) => {
                const l = LOCATIONS.find((x) => x.name === e.target.value);
                if (l) setLocation(l);
              }}
              className="bg-transparent text-sm font-medium outline-none [&>option]:bg-background"
            >
              {LOCATIONS.map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
              {!LOCATIONS.some((l) => l.name === location.name) && <option value="custom">{location.name}</option>}
            </select>
            <Button size="sm" variant="ghost" onClick={useMyLocation} aria-label="Use my location"><LocateFixed /></Button>
          </div>
          <Button size="sm" variant="glass" onClick={reload} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button>
        </div>
      </PageHeader>

      <div className="container mt-10 space-y-4">
        {(error || data?.source === "simulated") && (
          <div className="flex items-center gap-3 rounded-2xl border border-gold-500/40 bg-gold-400/10 px-4 py-3 text-sm">
            <Badge variant="demo">Simulated weather</Badge>
            <span>Open-Meteo could not be reached{error ? ` (${error})` : ""}. Showing labeled simulated weather instead.</span>
          </div>
        )}
        {geoMsg && <p className="text-sm text-muted-foreground">{geoMsg}</p>}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <Reveal className="relative min-h-[280px] overflow-hidden rounded-3xl text-white shadow-2xl">
            <WeatherBackdrop kind={now?.kind ?? "partly"} />
            <div className="relative flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/70">{data?.locationName ?? location.name} · now</p>
                  <p className="mt-2 font-display text-7xl font-semibold tracking-tight">{data ? Math.round(data.current.temp) : "—"}°</p>
                  <p className="mt-1 text-lg text-white/85">{now?.label ?? "Loading…"}</p>
                </div>
                <WeatherIcon kind={now?.kind ?? "partly"} className="h-20 w-20" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {[
                  { icon: Droplets, l: "Humidity", v: data ? `${data.current.humidity}%` : "—" },
                  { icon: Wind, l: "Wind", v: data ? `${Math.round(data.current.wind)} km/h` : "—" },
                  { icon: CloudRain, l: "Rain 14 d", v: data ? `${rain14.toFixed(0)} mm` : "—" },
                ].map((m) => (
                  <div key={m.l} className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
                    <m.icon className="h-4 w-4 text-white/70" />
                    <p className="mt-1 font-semibold">{m.v}</p>
                    <p className="text-[11px] text-white/60">{m.l}</p>
                  </div>
                ))}
              </div>
              <Badge variant={data?.source === "open-meteo" ? "live" : "demo"} className="self-start border-white/20 bg-white/15 text-white">
                {data?.source === "open-meteo" ? "● Open-Meteo data" : "◌ Simulated"}
              </Badge>
            </div>
          </Reveal>

          <Card>
            <CardHeader>
              <CardTitle>Recent weather</CardTitle>
              <CardDescription>Historical conditions for the selected location.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-foreground/[0.04] p-4"><p className="num font-display text-2xl font-semibold">{data ? `${avgHigh.toFixed(1)}°` : "—"}</p><p className="text-xs text-muted-foreground">Average high · 14 days</p></div>
              <div className="rounded-xl bg-foreground/[0.04] p-4"><p className="num font-display text-2xl font-semibold">{data ? humidDays : "—"}</p><p className="text-xs text-muted-foreground">Days above 80% humidity</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Forecast strip */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>7-day forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {forecast.map((d, i) => {
                const c = describeCode(d.code);
                const hot = d.tMax > thresholds.tempHighC;
                const cold = d.tMin < thresholds.frostC;
                return (
                  <motion.div key={d.date} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5 }} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-transform hover:-translate-y-1", hot || cold ? "border-yellow-500/40 bg-yellow-500/5" : "border-border/50 bg-foreground/[0.02]")}>
                    <p className="text-xs font-semibold">{i === 0 ? "Today" : new Date(`${d.date}T12:00:00`).toLocaleDateString([], { weekday: "short" })}</p>
                    <WeatherIcon kind={c.kind} className="h-10 w-10" />
                    <p className="num text-sm"><span className="font-semibold">{Math.round(d.tMax)}°</span> <span className="text-muted-foreground">{Math.round(d.tMin)}°</span></p>
                    <p className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-300"><Droplets className="h-3 w-3" />{d.precipitation.toFixed(1)} mm</p>
                    {(hot || cold) && <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-300">{hot ? "Heat" : "Cold"}</span>}
                  </motion.div>
                );
              })}
              {!forecast.length && Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-foreground/5" />)}
            </div>
          </CardContent>
        </Card>

        <WeatherCharts daily={daily} withCum={withCum} humidity={humidity} today={today} tempHighC={thresholds.tempHighC} humidityHighPct={thresholds.humidityHighPct} />
      </div>
    </div>
  );
}
