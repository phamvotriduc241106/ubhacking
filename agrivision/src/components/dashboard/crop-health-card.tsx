"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import Link from "next/link";
import { usePlants } from "@/hooks/use-plants";
import { HEALTH_META } from "@/lib/farm";
import type { HealthStatus } from "@/lib/types";

export function CropHealthCard({ index = 0 }: { index?: number }) {
  const plants = usePlants();
  const counts: Record<HealthStatus, number> = { healthy: 0, attention: 0, stress: 0 };
  plants.forEach((p) => counts[p.health]++);
  const total = plants.length || 1;
  const score = Math.round(((counts.healthy + counts.attention * 0.5) / total) * 100);
  const R = 34;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segs = (["healthy", "attention", "stress"] as HealthStatus[]).map((k) => {
    const len = (counts[k] / total) * C;
    const s = { k, len, offset };
    offset += len;
    return s;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="glass relative flex min-h-[188px] flex-col overflow-hidden rounded-3xl p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <Leaf className="h-[18px] w-[18px]" />
          </span>
          <span className="text-sm font-medium text-muted-foreground">Crop Health</span>
        </div>
        <span className="rounded-full bg-gold-400/15 px-2 py-0.5 text-[10px] font-semibold text-gold-500 dark:text-gold-300">Demo model</span>
      </div>
      <div className="mt-3 flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 80 80" className="-rotate-90">
            <circle cx="40" cy="40" r={R} fill="none" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="8" />
            {segs.map((s) =>
              s.len > 0 ? (
                <motion.circle
                  key={s.k}
                  cx="40"
                  cy="40"
                  r={R}
                  fill="none"
                  stroke={HEALTH_META[s.k].color}
                  strokeWidth="8"
                  strokeLinecap="butt"
                  initial={{ strokeDasharray: `0 ${C}` }}
                  animate={{ strokeDasharray: `${s.len} ${C - s.len}`, strokeDashoffset: -s.offset }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : null,
            )}
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-2xl font-semibold">{score}</span>
          </div>
        </div>
        <ul className="grid flex-1 gap-1.5 text-xs">
          {(Object.keys(counts) as HealthStatus[]).map((k) => (
            <li key={k} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_META[k].color }} />
                {HEALTH_META[k].label}
              </span>
              <span className="num font-semibold">{counts[k]}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/farm" className="mt-auto pt-3 text-[11px] font-medium text-primary hover:underline">
        Inspect plants in the digital twin →
      </Link>
    </motion.div>
  );
}
