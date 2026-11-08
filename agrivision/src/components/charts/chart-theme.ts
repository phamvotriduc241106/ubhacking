export const CHART_COLORS = {
  temp: "var(--chart-temp)",
  humidity: "var(--chart-hum)",
  light: "var(--chart-light)",
  rain: "var(--chart-rain)",
  growth: "var(--chart-growth)",
};

export const axisProps = {
  stroke: "hsl(var(--muted-foreground))",
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover) / 0.92)",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    backdropFilter: "blur(12px)",
    fontSize: 12,
    color: "hsl(var(--foreground))",
    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.35)",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", marginBottom: 4 },
  itemStyle: { padding: 0 },
  cursor: { stroke: "hsl(var(--primary) / 0.4)", strokeWidth: 1 },
};
