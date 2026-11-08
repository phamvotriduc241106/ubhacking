"use client";

import type { WeatherKind } from "@/components/shared/weather-icon";

/** CSS-only animated sky behind the current-conditions card. */
export function WeatherBackdrop({ kind }: { kind: WeatherKind }) {
  const rain = kind === "rain" || kind === "storm";
  const clouds = kind !== "sun";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{
          background: rain
            ? "linear-gradient(160deg, #334155 0%, #1e293b 60%, #0f1f1a 100%)"
            : clouds
              ? "linear-gradient(160deg, #64748b 0%, #2f4a3f 70%, #10301f 100%)"
              : "linear-gradient(160deg, #0ea5e9 0%, #10796b 55%, #10301f 100%)",
        }}
      />
      {(kind === "sun" || kind === "partly") && (
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,#fde68a_0%,rgba(253,230,138,0.35)_40%,transparent_70%)] animate-float" />
      )}
      {clouds &&
        [0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute h-16 w-44 rounded-full bg-white/25 blur-xl animate-drift"
            style={{ top: `${10 + i * 18}%`, animationDuration: `${30 + i * 9}s`, animationDelay: `${-i * 7}s`, opacity: rain ? 0.5 : 0.8 }}
          />
        ))}
      {rain &&
        Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 h-[120%] w-px bg-gradient-to-b from-transparent via-sky-200/50 to-transparent animate-rain"
            style={{ left: `${(i * 2.5) % 100}%`, animationDuration: `${0.6 + (i % 5) * 0.12}s`, animationDelay: `${-(i % 7) * 0.13}s` }}
          />
        ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
    </div>
  );
}
