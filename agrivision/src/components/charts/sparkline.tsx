"use client";

import { useId, useMemo } from "react";

/**
 * Dependency-free sparkline (area + line), visually matching the previous Recharts version.
 * Keeping Recharts out of the cards removes it from the initial bundle of every page
 * that only needs trend lines; the full interactive chart is lazy-loaded separately.
 */
export function Sparkline({ data, color, id }: { data: { v: number }[]; color: string; id: string }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `spark-${id}-${uid}`;
  const { line, area } = useMemo(() => {
    const W = 100;
    const H = 40;
    const vals = data.map((d) => d.v).filter((v) => Number.isFinite(v));
    if (vals.length < 2) return { line: "", area: "" };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const pad = 3; // keep the stroke inside the box, like the Recharts top margin
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * W, pad + (1 - (v - min) / span) * (H - pad)] as const);
    // Monotone-ish smoothing with short cubic segments
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += `C${cx.toFixed(2)},${y0.toFixed(2)} ${cx.toFixed(2)},${y1.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
    }
    return { line: d, area: `${d}L${W},${H}L0,${H}Z` };
  }, [data]);

  if (!line) return null;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color }} stopOpacity={0.45} />
          <stop offset="100%" style={{ stopColor: color }} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} stroke="none" />
      <path d={line} fill="none" style={{ stroke: color }} strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
