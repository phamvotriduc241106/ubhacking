"use client";

import { motion } from "framer-motion";
import { Bell, Box, CloudSun, Gauge, ScanSearch, Sprout } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/shared/section-heading";

const FEATURES = [
  { href: "/farm", icon: Box, title: "3D Digital Twin", text: "Explore every bed, plant and sensor node. Color-coded health, farm zones and live weather in an interactive 3D farm.", accent: "#34d399" },
  { href: "/dashboard", icon: Gauge, title: "IoT Sensor Dashboard", text: "Temperature, humidity, light and canopy growth with 24-hour trends, plus a pluggable integration mode for real hardware.", accent: "#38bdf8" },
  { href: "/analysis", icon: ScanSearch, title: "AI Crop Analysis", text: "Upload a photo of a plant or fruit. Get visible symptoms, ripeness and suggestions, clearly labeled AI or demo.", accent: "#e6cc85" },
  { href: "/weather", icon: CloudSun, title: "Weather Intelligence", text: "Two weeks of history and a 7-day forecast for your field, with alerts for heat, cold and heavy rain.", accent: "#93c5fd" },
  { href: "/growth", icon: Sprout, title: "Growth Timeline", text: "Scrub a procedurally grown tomato from seedling to harvest and learn what each stage needs.", accent: "#86efac" },
  { href: "/alerts", icon: Bell, title: "Smart Recommendations", text: "Camera, sensor and weather evidence fused into actionable alerts with thresholds you control.", accent: "#fca5a5" },
];

export function Features() {
  return (
    <section className="container py-24 sm:py-32">
      <SectionHeading
        eyebrow="Platform"
        title={<>One intelligent layer over <span className="text-gradient">every plant</span> in your field.</>}
        description="FolLand connects what your sensors measure, what your camera sees and what the sky is doing — then tells you what matters today."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div key={f.href} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6, delay: (i % 3) * 0.08 }}>
            <Link href={f.href} className="glass group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1.5">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-50" style={{ background: f.accent }} />
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-border/60 bg-background/40" style={{ color: f.accent }}>
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              <span className="mt-auto text-sm font-medium text-primary opacity-80 transition-all group-hover:translate-x-1 group-hover:opacity-100">Open →</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
