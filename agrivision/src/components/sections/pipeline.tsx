"use client";

import { LocalizedText } from "@/i18n/localized";
import { motion } from "framer-motion";
import { BrainCircuit, Camera, CloudSun, Radio, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";

const STEPS = [
  { icon: Radio, title: "Sense", text: "Sensor nodes stream air temperature, humidity, light and canopy distance." },
  { icon: Camera, title: "See", text: "A phone photo captures leaf color, symptoms and fruit ripeness." },
  { icon: CloudSun, title: "Contextualize", text: "Weather history and forecast add the field-scale picture." },
  { icon: BrainCircuit, title: "Analyze", text: "Rules and, when connected, a vision model weigh all evidence." },
  { icon: Sparkles, title: "Recommend", text: "Clear actions, each tagged with real or simulated evidence." },
];

export function Pipeline() {
  return (
    <section className="container py-24 sm:py-32">
      <SectionHeading align="center" eyebrow="How it works" title="From signal to decision in seconds." />
      <div className="relative mt-16 grid gap-6 md:grid-cols-5">
        <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent md:block" />
        {STEPS.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }} className="relative flex flex-col items-center text-center">
            <span className="glass glow-ring relative z-10 grid h-14 w-14 place-items-center rounded-2xl text-primary">
              <s.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-semibold"><LocalizedText text={s.title} /></h3>
            <p className="mt-1.5 max-w-[220px] text-sm text-muted-foreground"><LocalizedText text={s.text} /></p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
