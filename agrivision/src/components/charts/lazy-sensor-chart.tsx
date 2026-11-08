"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { SensorChart as SensorChartType } from "./sensor-chart";

const SensorChartInner = dynamic(() => import("./sensor-chart").then((m) => m.SensorChart), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-foreground/[0.05]" />,
});

/**
 * Recharts is ~100 kB of JavaScript. Loading it as a separate chunk lets the page paint and
 * become interactive first; the box keeps its final height so nothing jumps when it arrives.
 */
export function LazySensorChart(props: ComponentProps<typeof SensorChartType>) {
  const height = props.height ?? 320;
  return (
    <div style={{ minHeight: height + 48 }}>
      <SensorChartInner {...props} />
    </div>
  );
}
