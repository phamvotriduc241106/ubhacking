"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { AlertTriangle, CloudRain, Droplets, LocateFixed, MapPin, RefreshCw, Thermometer, TrendingUp, Wind } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS, axisProps, tooltipStyle } from "@/components/charts/chart-theme";
import { EvidenceBadge } from "@/components/shared/origin-badge";
import { PageHeader } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { WeatherIcon } from "@/components/shared/weather-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlerts } from "@/hooks/use-alerts";
import { useWeather } from "@/hooks/use-weather";
import { useApp } from "@/lib/store";
import { cn, formatDay } from "@/lib/utils";
import { describeCode, LOCATIONS } from "@/lib/weather";
import { WeatherBackdrop } from "./weather-backdrop";

const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });

export function WeatherIntel() {
  const { data, loading, error, reload } = useWeather();
  const location = useApp((s) => s.location);
  const setLocation = useApp((s) => s.setLocation);
  const thresholds = useApp((s) => s.thresholds);
  const alerts = useAlerts().filter((a) => a.category === "weather" || a.category === "temperature");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
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
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 13);
    const now = new Date().toISOString().slice(0, 13);
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
      <PageHeader eyebrow="Weather intelligence" title={<><Localized id="ui_f45fc1dfdc96db27" fallback="Field" />{" "}<span className="text-gradient"><Localized id="ui_80db1a7acc05408b" fallback="Weather Intelligence" /></span></>} description="Two weeks of weather history and a 7-day forecast, translated into growing conditions for tomatoes.">
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
          <Button size="sm" variant="glass" onClick={reload} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />{" "}<Localized id="ui_0e91610117029a62" fallback="Refresh" /></Button>
        </div>
      </PageHeader>

      <div className="container mt-10 space-y-4">
        {(error || data?.source === "simulated") && (
          <div className="flex items-center gap-3 rounded-2xl border border-gold-500/40 bg-gold-400/10 px-4 py-3 text-sm">
            <Badge variant="demo"><Localized id="ui_976727eb0e60c0c5" fallback="Simulated weather" /></Badge>
            <span><Localized id="ui_30983965b9557756" fallback="Open-Meteo could not be reached" />{error ? ` (${error})` : ""}<Localized id="ui_6878c0d225059151" fallback=". Showing labeled simulated weather instead." /></span>
          </div>
        )}
        {geoMsg && <p className="text-sm text-muted-foreground">{geoMsg}</p>}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <Reveal className="relative min-h-[280px] overflow-hidden rounded-3xl text-white shadow-2xl">
            <WeatherBackdrop kind={now?.kind ?? "partly"} />
            <div className="relative flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/70">{data?.locationName ?? location.name}{" "}<Localized id="ui_4bd85caaf454c89e" fallback="· now" /></p>
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
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-gold-500" />{" "}<Localized id="ui_9366d7f07233e1fc" fallback="Growing-condition alerts" /></CardTitle>
              <CardDescription><Localized id="ui_79d5725b5a66c588" fallback="Based on forecast, history and your thresholds." /></CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.length === 0 && <p className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"><Localized id="ui_1811cd90e2439ae8" fallback="No unfavorable growing conditions detected for the next few days." /></p>}
              {alerts.map((a) => (
                <div key={a.id} className={cn("rounded-2xl border p-3.5", a.severity === "critical" ? "border-red-500/40 bg-red-500/10" : a.severity === "warning" ? "border-yellow-500/40 bg-yellow-500/10" : "border-border bg-foreground/[0.03]")}>
                  <p className="text-sm font-semibold"><LocalizedText text={a.title} /></p>
                  <p className="mt-0.5 text-sm text-foreground/75"><LocalizedText text={a.message} /></p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{a.evidence.map((e) => <EvidenceBadge key={e.detail} kind={e.kind} />)}</div>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                {[
                  { l: "Avg high (14 d)", v: `${avgHigh.toFixed(1)}°` },
                  { l: "Humid days > 80%", v: `${humidDays}` },
                  { l: "Heat limit", v: `${thresholds.tempHighC}°` },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-foreground/[0.04] p-2.5">
                    <p className="num font-display text-xl font-semibold">{s.v}</p>
                    <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forecast strip */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle><Localized id="ui_c124b17a27e443b6" fallback="7-day forecast" /></CardTitle>
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

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Thermometer className="h-5 w-5" style={{ color: CHART_COLORS.temp }} />{" "}<Localized id="ui_2ab29163d41081a2" fallback="Temperature history & forecast" /></CardTitle>
              <CardDescription><Localized id="ui_9151bc3cafb495b2" fallback="Daily range (min–max). Dashed line marks today; red line is your heat limit." /></CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={daily} margin={{ left: -12, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="temp-range" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" style={{ stopColor: CHART_COLORS.temp }} stopOpacity={0.45} />
                      <stop offset="100%" style={{ stopColor: CHART_COLORS.temp }} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                  <YAxis {...axisProps} unit="°" />
                  <Tooltip {...tooltipStyle} formatter={(v: number | number[]) => (Array.isArray(v) ? `${v[0]}° – ${v[1]}°` : `${v}°`)} />
                  <Area type="monotone" dataKey="range" name="Range" stroke={CHART_COLORS.temp} fill="url(#temp-range)" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="tMax" name="High" stroke={CHART_COLORS.temp} strokeWidth={2} dot={false} />
                  <ReferenceLine y={thresholds.tempHighC} stroke="#ef4444" strokeDasharray="4 4" />
                  <ReferenceLine x={shortDay(today)} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="3 3" label={{ value: "Today", fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "top" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CloudRain className="h-5 w-5" style={{ color: CHART_COLORS.rain }} />{" "}<Localized id="ui_1057922f08186d71" fallback="Rainfall" /></CardTitle>
              <CardDescription><Localized id="ui_9fa8890f5e8ac8cd" fallback="Daily precipitation. Lighter bars are forecast." /></CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                  <YAxis {...axisProps} unit=" mm" width={56} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: "hsl(var(--foreground) / 0.05)" }} formatter={(v: number) => `${v} mm`} />
                  <Bar dataKey="precipitation" name="Rain" radius={[6, 6, 0, 0]}>
                    {daily.map((d) => (
                      <Cell key={d.date} fill={CHART_COLORS.rain} fillOpacity={d.isForecast ? 0.4 : 0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5" style={{ color: CHART_COLORS.humidity }} />{" "}<Localized id="ui_4d28cc7691ca9e8f" fallback="Humidity trend · 7 days" /></CardTitle>
              <CardDescription><Localized id="ui_c05638e42ccdfe42" fallback="Hourly relative humidity. Sustained values above your limit raise fungal risk." /></CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={humidity} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="t" {...axisProps} tickFormatter={(t: string) => shortDay(t.slice(0, 10))} minTickGap={40} />
                  <YAxis {...axisProps} domain={[0, 100]} unit="%" />
                  <Tooltip {...tooltipStyle} labelFormatter={(t: string) => `${formatDay(t)} ${t.slice(11, 16)}`} />
                  <ReferenceLine y={thresholds.humidityHighPct} stroke="#eab308" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="humidity" name="Humidity %" stroke={CHART_COLORS.humidity} strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" style={{ color: CHART_COLORS.growth }} />{" "}<Localized id="ui_689fe59ab00f0b80" fallback="Growing degree days" /></CardTitle>
              <CardDescription><Localized id="ui_a4b586c6d0b9f83f" fallback="Heat accumulation for tomatoes (base 10 °C, cap 30 °C) over the last 14 days." /></CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={withCum} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                  <YAxis yAxisId="l" {...axisProps} />
                  <YAxis yAxisId="r" orientation="right" {...axisProps} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => v.toFixed(1)} />
                  <Bar yAxisId="l" dataKey="gdd" name="Daily GDD" fill={CHART_COLORS.growth} fillOpacity={0.5} radius={[5, 5, 0, 0]} />
                  <Line yAxisId="r" type="monotone" dataKey="cum" name="Cumulative" stroke={CHART_COLORS.growth} strokeWidth={2.2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
