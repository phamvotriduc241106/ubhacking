"use client";

import { CloudRain, Droplets, Thermometer, TrendingUp } from "lucide-react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS, axisProps, tooltipStyle } from "@/components/charts/chart-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherDay } from "@/lib/types";
import { formatDay } from "@/lib/utils";

export const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });

type Day = WeatherDay & { label: string; range: [number, number]; gdd: number };

export interface WeatherChartsProps {
  daily: Day[];
  withCum: (Day & { cum: number })[];
  humidity: { t: string; humidity: number; temp: number }[];
  today: string;
  tempHighC: number;
  humidityHighPct: number;
}

/** The four Recharts panels of the weather page, split out so Recharts loads as its own chunk. */
export default function WeatherChartsImpl({ daily, withCum, humidity, today, tempHighC, humidityHighPct }: WeatherChartsProps) {
  return (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Thermometer className="h-5 w-5" style={{ color: CHART_COLORS.temp }} /> Temperature history & forecast</CardTitle>
              <CardDescription>Daily range (min–max). Dashed line marks today; red line is your heat limit.</CardDescription>
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
                  <ReferenceLine y={tempHighC} stroke="#ef4444" strokeDasharray="4 4" />
                  <ReferenceLine x={shortDay(today)} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="3 3" label={{ value: "Today", fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "top" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CloudRain className="h-5 w-5" style={{ color: CHART_COLORS.rain }} /> Rainfall</CardTitle>
              <CardDescription>Daily precipitation. Lighter bars are forecast.</CardDescription>
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
              <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5" style={{ color: CHART_COLORS.humidity }} /> Humidity trend · 7 days</CardTitle>
              <CardDescription>Hourly relative humidity. Sustained values above your limit raise fungal risk.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={humidity} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="t" {...axisProps} tickFormatter={(t: string) => shortDay(t.slice(0, 10))} minTickGap={40} />
                  <YAxis {...axisProps} domain={[0, 100]} unit="%" />
                  <Tooltip {...tooltipStyle} labelFormatter={(t: string) => `${formatDay(t)} ${t.slice(11, 16)}`} />
                  <ReferenceLine y={humidityHighPct} stroke="#eab308" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="humidity" name="Humidity %" stroke={CHART_COLORS.humidity} strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" style={{ color: CHART_COLORS.growth }} /> Growing degree days</CardTitle>
              <CardDescription>Heat accumulation for tomatoes (base 10 °C, cap 30 °C) over the last 14 days.</CardDescription>
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
  );
}
