"use client";

import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useEffect, useState } from "react";

export function useAnimatedNumber(target: number, duration = 0.9) {
  const mv = useMotionValue(target);
  const [v, setV] = useState(target);
  useMotionValueEvent(mv, "change", setV);
  useEffect(() => {
    const c = animate(mv, target, { duration, ease: [0.22, 1, 0.36, 1] });
    return c.stop;
  }, [target, duration, mv]);
  return v;
}
