"use client";

import { cn } from "@/lib/utils";

export type WeatherKind = "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm";

/** Lightweight animated SVG weather glyph. */
export function WeatherIcon({ kind, className }: { kind: WeatherKind; className?: string }) {
  const sun = kind === "sun" || kind === "partly";
  const cloud = kind !== "sun";
  const rain = kind === "rain" || kind === "storm";
  return (
    <svg viewBox="0 0 64 64" className={cn("h-12 w-12 overflow-visible", className)} aria-hidden>
      {sun && (
        <g>
          <g className="animate-spin-slow" style={{ transformOrigin: kind === "sun" ? "32px 32px" : "26px 22px" }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const cx = kind === "sun" ? 32 : 26;
              const cy = kind === "sun" ? 32 : 22;
              return <line key={i} x1={cx + Math.cos(a) * 15} y1={cy + Math.sin(a) * 15} x2={cx + Math.cos(a) * 20} y2={cy + Math.sin(a) * 20} stroke="#e6b94a" strokeWidth="3" strokeLinecap="round" />;
            })}
          </g>
          <circle cx={kind === "sun" ? 32 : 26} cy={kind === "sun" ? 32 : 22} r="10" fill="#f5c84c" />
        </g>
      )}
      {cloud && (
        <g className="animate-float">
          <path
            d="M20 44h26a9 9 0 0 0 0-18 13 13 0 0 0-25 3.5A7.3 7.3 0 0 0 20 44Z"
            fill={rain ? "#8a9a9c" : kind === "fog" ? "#c7cfcf" : "#e7ecec"}
            stroke="rgba(0,0,0,0.06)"
          />
        </g>
      )}
      {rain &&
        [22, 32, 42].map((x, i) => (
          <line key={x} x1={x} y1="48" x2={x - 3} y2="56" stroke="#5aa9e6" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      {kind === "storm" && <path d="M34 46l-5 8h5l-3 7 8-10h-5l3-5z" fill="#f5c84c" />}
      {kind === "snow" && [24, 34, 44].map((x) => <circle key={x} cx={x} cy="52" r="2" fill="#dbeafe" />)}
    </svg>
  );
}

export function conditionKind(c: "sunny" | "cloudy" | "rainy"): WeatherKind {
  return c === "sunny" ? "sun" : c === "cloudy" ? "cloud" : "rain";
}
