"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Droplets, Leaf, Radio, Ruler, Sun, Thermometer, X } from "lucide-react";
import { OriginBadge } from "@/components/shared/origin-badge";
import { HEALTH_META, RIPENESS_META, SENSOR_NODES, ZONES } from "@/lib/farm";
import { zoneReading } from "@/lib/simulation";
import { useApp } from "@/lib/store";
import type { HealthStatus, PlantState, ZoneId } from "@/lib/types";
import { cn, formatLux } from "@/lib/utils";

function HealthBadge({ h }: { h: HealthStatus }) {
  const m = HEALTH_META[h];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `${m.color}20`, color: m.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      <LocalizedText text={m.label} />
    </span>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-foreground/[0.04] p-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="num mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function plantAdvice(p: PlantState): string[] {
  const out: string[] = [];
  if (p.issues.some((i) => i.includes("humidity"))) out.push("Improve airflow and water at the base in the morning.");
  if (p.issues.some((i) => i.includes("waterlogged"))) out.push("Pause irrigation on this bed until the soil drains.");
  if (p.issues.some((i) => i.includes("Heat"))) out.push("Water deeply early and shade during peak heat.");
  if (p.issues.some((i) => i.includes("yellowing"))) out.push("Inspect lower leaves; check watering consistency and nutrition.");
  if (p.issues.some((i) => i.includes("wilting"))) out.push("Check soil moisture at 5–10 cm and the drip emitter.");
  if (p.ripeness === "ripe") out.push("Fruit is ready — harvest within 2–3 days.");
  if (p.ripeness === "overripe") out.push("Harvest immediately and remove soft fruit.");
  if (p.ripeness === "turning") out.push("Breaker stage — pick to ripen indoors if rain is forecast.");
  if (!out.length) out.push("No action needed. Keep the current irrigation schedule.");
  return out;
}

export function FarmInspector({ plants, sensorId, onSensor }: { plants: PlantState[]; sensorId: string | null; onSensor: (id: string | null) => void }) {
  const selectedId = useApp((s) => s.selectedPlantId);
  const selectPlant = useApp((s) => s.selectPlant);
  const zone = useApp((s) => s.selectedZone);
  const setZone = useApp((s) => s.setZone);
  const latest = useApp((s) => s.latest);
  const plant = plants.find((p) => p.id === selectedId);
  const sensor = SENSOR_NODES.find((n) => n.id === sensorId);

  const zonePlants = zone === "all" ? plants : plants.filter((p) => p.zone === zone);
  const flagged = zonePlants.filter((p) => p.health !== "healthy").sort((a, b) => (a.health === "stress" ? -1 : 1) - (b.health === "stress" ? -1 : 1));

  return (
    <div className="glass flex h-full flex-col overflow-hidden rounded-3xl">
      <AnimatePresence mode="wait">
        {plant ? (
          <motion.div key={plant.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Zone {plant.zone}{" "}<Localized id="ui_010f25b52c7fab16" fallback="· Bed" />{" "}{plant.bed + 1}{" "}<Localized id="ui_1c04c4357da4af92" fallback="· Position" />{" "}{plant.index + 1}</p>
                <h3 className="mt-0.5 text-2xl font-semibold"><Localized id="ui_8289a9844fd5125f" fallback="Tomato" />{" "}{plant.id}</h3>
              </div>
              <button onClick={() => selectPlant(null)} className="rounded-full p-1.5 hover:bg-foreground/10" aria-label="Close plant details">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HealthBadge h={plant.health} />
              <OriginBadge origin={latest?.origin} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={Thermometer} label="Leaf zone temp" value={`${plant.leafTempC.toFixed(1)} °C`} />
              <Stat icon={Droplets} label="Canopy humidity" value={`${plant.localHumidityPct.toFixed(0)} %`} />
              <Stat icon={Ruler} label="Plant height" value={`${plant.heightCm} cm`} />
              <Stat icon={Sun} label="Light" value={latest?.lightLux == null ? "—" : `${formatLux(zoneReading(latest, plant.zone).lightLux ?? 0)} lux`} />
            </div>
            <div className="rounded-2xl bg-foreground/[0.04] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground"><Localized id="ui_2008dab0e1a4778b" fallback="Estimated ripeness" /></span>
                <span className="font-semibold">{plant.ripeness ? `${RIPENESS_META[plant.ripeness].label} · ${plant.ripenessPct}%` : "Not fruiting yet"}</span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-gradient-to-r from-[#5c9a3c] via-[#e0a03a] to-[#d8382a] opacity-90">
                <motion.div className="h-full bg-background/80" initial={{ marginLeft: "0%" }} animate={{ marginLeft: `${plant.ripenessPct}%` }} transition={{ duration: 0.8 }} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground"><Localized id="ui_906162c2e4038f16" fallback="Growth stage" />{" "}{plant.growth.toFixed(1)} / 5 — {ZONES.find((z) => z.id === plant.zone)?.focus}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Localized id="ui_f87558869bcf8816" fallback="Observations" /></p>
              {plant.issues.length ? (
                <ul className="space-y-1.5">
                  {plant.issues.map((i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" /> {i}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex gap-2 text-sm"><Leaf className="h-4 w-4 text-emerald-500" />{" "}<Localized id="ui_083f9b115edab2b3" fallback="No issues observed." /></p>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Localized id="ui_b24c7c25424d7f20" fallback="Suggested actions" /></p>
              <ul className="space-y-1.5 text-sm">
                {plantAdvice(plant).map((a) => (
                  <li key={a} className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {a}</li>
                ))}
              </ul>
            </div>
            <p className="mt-auto text-[11px] leading-relaxed text-muted-foreground"><Localized id="ui_eb4c23f6e4d4cabc" fallback="Plant-level conditions are modeled from zone sensor readings and a demo scouting log. They are not individual plant measurements." /></p>
          </motion.div>
        ) : sensor ? (
          <motion.div key={sensor.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Zone {sensor.zone} · {ZONES.find((z) => z.id === sensor.zone)?.name}</p>
                <h3 className="mt-0.5 flex items-center gap-2 text-2xl font-semibold"><Radio className="h-5 w-5 text-primary" /> <LocalizedText text={sensor.label} /></h3>
              </div>
              <button onClick={() => onSensor(null)} className="rounded-full p-1.5 hover:bg-foreground/10" aria-label="Close sensor details"><X className="h-4 w-4" /></button>
            </div>
            <OriginBadge origin={latest?.origin} className="self-start" />
            {latest ? (
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const z = zoneReading(latest, sensor.zone);
                  return (
                    <>
                      <Stat icon={Thermometer} label="Air temperature" value={`${z.temperatureC.toFixed(1)} °C`} />
                      <Stat icon={Droplets} label="Humidity" value={`${z.humidityPct.toFixed(0)} %`} />
                      <Stat icon={Sun} label="Light" value={z.lightLux == null ? "No sensor" : `${formatLux(z.lightLux)} lux`} />
                      <Stat icon={Ruler} label="Canopy distance" value={latest.distanceCm == null ? "—" : `${latest.distanceCm.toFixed(1)} cm`} />
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground"><Localized id="ui_dde0205d19c75310" fallback="Waiting for readings…" /></p>
            )}
            <p className="text-xs text-muted-foreground"><Localized id="ui_7104bccabe61bfaf" fallback="Hardware profile: DHT22 temperature/humidity, BH1750 light, HC-SR04 ultrasonic distance. Zone readings apply a per-zone microclimate offset to the main feed." /></p>
          </motion.div>
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div>
              <h3 className="text-xl font-semibold"><Localized id="ui_ce176b8832ae1bc9" fallback="Farm overview" /></h3>
              <p className="text-sm text-muted-foreground"><Localized id="ui_3dfdbb95cb61fd80" fallback="Click any plant or sensor in the scene, or pick a zone." /></p>
            </div>
            <div className="grid gap-2">
              {ZONES.map((z) => {
                const zp = plants.filter((p) => p.zone === z.id);
                const c = { healthy: 0, attention: 0, stress: 0 } as Record<HealthStatus, number>;
                zp.forEach((p) => c[p.health]++);
                return (
                  <button
                    key={z.id}
                    onClick={() => setZone(zone === z.id ? "all" : (z.id as ZoneId))}
                    className={cn("group rounded-2xl border p-3 text-left transition-all hover:bg-foreground/[0.04]", zone === z.id ? "border-primary/50 bg-primary/5" : "border-transparent bg-foreground/[0.03]")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Zone {z.id} · {z.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{z.focus}</p>
                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-foreground/10">
                      {(["healthy", "attention", "stress"] as HealthStatus[]).map((k) => (
                        <div key={k} style={{ width: `${(c[k] / zp.length) * 100}%`, background: HEALTH_META[k].color }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Localized id="ui_9bb0983e8703e40a" fallback="Needs a look (" />{flagged.length})</p>
              {flagged.length ? (
                <ul className="grid gap-1.5">
                  {flagged.slice(0, 8).map((p) => (
                    <li key={p.id}>
                      <button onClick={() => selectPlant(p.id)} className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/5">
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_META[p.health].color }} />
                          {p.id}
                        </span>
                        <span className="min-w-0 truncate text-xs text-muted-foreground">{p.issues[0]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground"><Localized id="ui_b2d2a480cb02f8ac" fallback="Every plant in this view looks healthy." /></p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
