"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | null;
  unit: string;
  decimals?: number;
  format?: (v: number) => string;
  color: string;
  trend?: { v: number }[];
  delta?: { value: number; unit: string; label: string } | null;
  status?: { text: string; tone: "good" | "warn" | "bad" | "neutral" };
  footer?: ReactNode;
  index?: number;
}

const TONE = {
  good: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10",
  warn: "text-yellow-700 dark:text-yellow-300 bg-yellow-500/10",
  bad: "text-red-600 dark:text-red-300 bg-red-500/10",
  neutral: "text-muted-foreground bg-foreground/5",
};

export function MetricCard({ icon: Icon, label, value, unit, decimals = 1, format, color, trend, delta, status, footer, index = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="glass group relative flex min-h-[188px] flex-col overflow-hidden rounded-3xl p-5"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-60" style={{ background: color }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        {status && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", TONE[status.tone])}>{status.text}</span>}
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        {value == null ? (
          <span className="font-display text-3xl font-semibold text-muted-foreground">—</span>
        ) : (
          <AnimatedNumber value={value} decimals={decimals} format={format} className="font-display text-4xl font-semibold tracking-tight" />
        )}
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      {delta && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className={delta.value >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-sky-600 dark:text-sky-300"}>
            {delta.value >= 0 ? "▲" : "▼"} {Math.abs(delta.value).toFixed(1)}
            {delta.unit}
          </span>{" "}
          {delta.label}
        </p>
      )}
      <div className="mt-auto h-12 pt-3">{trend && trend.length > 1 && <Sparkline data={trend} color={color} id={label.replace(/\W/g, "")} />}</div>
      {footer && <div className="mt-2 text-[11px] text-muted-foreground">{footer}</div>}
    </motion.div>
  );
}
