"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

export function Sparkline({ data, color, id }: { data: { v: number }[]; color: string; id: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: color }} stopOpacity={0.45} />
            <stop offset="100%" style={{ stopColor: color }} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#spark-${id})`} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
