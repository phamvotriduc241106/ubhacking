"use client";

import dynamic from "next/dynamic";
import type { WeatherChartsProps } from "./weather-charts";

const Inner = dynamic(() => import("./weather-charts"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="glass h-[372px] animate-pulse rounded-3xl" />
      ))}
    </div>
  ),
});

export function WeatherCharts(props: WeatherChartsProps) {
  return <Inner {...props} />;
}
