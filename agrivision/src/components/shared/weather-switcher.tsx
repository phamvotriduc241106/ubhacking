"use client";

import { motion } from "framer-motion";
import { Cloud, CloudRain, Sun } from "lucide-react";
import { useApp } from "@/lib/store";
import type { WeatherCondition } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { id: WeatherCondition; label: string; icon: typeof Sun }[] = [
  { id: "sunny", label: "Sunny", icon: Sun },
  { id: "cloudy", label: "Cloudy", icon: Cloud },
  { id: "rainy", label: "Rainy", icon: CloudRain },
];

export function WeatherSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const condition = useApp((s) => s.condition);
  const setCondition = useApp((s) => s.setCondition);
  const mode = useApp((s) => s.mode);
  return (
    <div className={cn("glass inline-flex items-center gap-1 rounded-full p-1", className)} role="radiogroup" aria-label="Farm weather environment">
      {OPTIONS.map((o) => {
        const active = condition === o.id;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={active}
            onClick={() => setCondition(o.id)}
            title={mode === "live" ? "Changes the 3D scene only; live readings are not altered" : "Changes the 3D scene and the simulated readings"}
            className={cn(
              "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && <motion.span layoutId="weather-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <o.icon className="relative h-3.5 w-3.5" />
            {!compact && <span className="relative">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
