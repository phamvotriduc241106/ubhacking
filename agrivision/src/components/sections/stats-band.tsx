"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { FARM_LAYOUT, SENSOR_NODES } from "@/lib/farm";

const STATS = [
  { value: FARM_LAYOUT.length, label: "Plants in the twin", suffix: "" },
  { value: SENSOR_NODES.length + 1, label: "Sensor stations", suffix: "" },
  { value: 144, label: "Readings / day / sensor", suffix: "" },
  { value: 21, label: "Days of weather context", suffix: "" },
];

export function StatsBand() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section ref={ref} className="container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className="glass grid grid-cols-2 gap-6 rounded-3xl p-6 sm:p-8 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <span className="font-display text-4xl font-semibold tracking-tight text-gradient sm:text-5xl">
              <AnimatedNumber value={inView ? s.value : 0} decimals={0} />
              {s.suffix}
            </span>
            <span className="text-sm text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
