"use client";

import { useAnimatedNumber } from "@/hooks/use-animated-number";

export function AnimatedNumber({ value, decimals = 1, className, format }: { value: number; decimals?: number; className?: string; format?: (v: number) => string }) {
  const v = useAnimatedNumber(value);
  return <span className={className ? `num ${className}` : "num"}>{format ? format(v) : v.toFixed(decimals)}</span>;
}
