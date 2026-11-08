"use client";

import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SensorReading } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { CHART_COLORS, axisProps, tooltipStyle } from "./chart-theme";

type Series = "temp" | "humidity" | "light";
const SERIES: { id: Series; label: string; color: string }[] = [
  { id: "temp", label: "Temperature °C", color: CHART_COLORS.temp },
  { id: "humidity", label: "Humidity %", color: CHART_COLORS.humidity },
  { id: "light", label: "Light (k lux)", color: CHART_COLORS.light },
];

export function SensorChart({ history, height = 320 }: { history: SensorReading[]; height?: number }) {
  const [range, setRange] = useState("24");
  const [on, setOn] = useState<Record<Series, boolean>>({ temp: true, humidity: true, light: true });

  const data = useMemo(() => {
    const cutoff = Date.now() - Number(range) * 3600000;
    return history
      .filter((r) => r.timestamp >= cutoff)
      .map((r) => ({
        t: r.timestamp,
        temp: +r.temperatureC.toFixed(1),
        humidity: +r.humidityPct.toFixed(0),
        light: r.lightLux == null ? null : +(r.lightLux / 1000).toFixed(1),
      }));
  }, [history, range]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SERIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setOn((o) => ({ ...o, [s.id]: !o[s.id] }))}
              aria-pressed={on[s.id]}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                on[s.id] ? "border-border bg-foreground/5 text-foreground" : "border-transparent text-muted-foreground opacity-60",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
        <Tabs value={range} onValueChange={setRange}>
          <TabsList>
            <TabsTrigger value="6">6h</TabsTrigger>
            <TabsTrigger value="12">12h</TabsTrigger>
            <TabsTrigger value="24">24h</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div style={{ height }} className="-ml-2">
        {data.length < 2 ? (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
            Collecting readings… the chart fills in as data arrives.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g-light" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: CHART_COLORS.light }} stopOpacity={0.35} />
                  <stop offset="100%" style={{ stopColor: CHART_COLORS.light }} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={formatTime} minTickGap={40} {...axisProps} />
              <YAxis yAxisId="left" width={36} domain={["auto", "auto"]} {...axisProps} />
              <YAxis yAxisId="right" orientation="right" width={36} domain={[0, "auto"]} {...axisProps} hide={!on.light} />
              <Tooltip {...tooltipStyle} labelFormatter={(v) => formatTime(Number(v))} />
              <Legend content={() => null} />
              {on.light && (
                <Area yAxisId="right" type="monotone" dataKey="light" name="Light (k lux)" stroke={CHART_COLORS.light} strokeWidth={1.5} fill="url(#g-light)" dot={false} connectNulls />
              )}
              {on.temp && <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperature °C" stroke={CHART_COLORS.temp} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />}
              {on.humidity && <Line yAxisId="left" type="monotone" dataKey="humidity" name="Humidity %" stroke={CHART_COLORS.humidity} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
