"use client";

import { motion } from "framer-motion";
import { Bot, CheckCircle2, ChevronRight, Droplets, FlaskConical, Leaf, Sun, Thermometer } from "lucide-react";
import type { ReactNode } from "react";
import { OriginBadge } from "@/components/shared/origin-badge";
import { ReportTemplate } from "./report-template";
import type { AnalysisResult, CropCondition, EnvironmentRating, Ripeness, SensorReading } from "@/lib/types";
import { cn, formatLux } from "@/lib/utils";

const CONDITIONS: { id: CropCondition; label: string; color: string }[] = [
  { id: "healthy", label: "Healthy", color: "#22c55e" },
  { id: "attention", label: "Needs Attention", color: "#eab308" },
  { id: "disease", label: "Possible Disease", color: "#ef4444" },
];
const RIPENESS: { id: Ripeness; label: string; color: string }[] = [
  { id: "unripe", label: "Unripe", color: "#5c9a3c" },
  { id: "turning", label: "Turning", color: "#e0a03a" },
  { id: "ripe", label: "Ripe", color: "#d8382a" },
  { id: "overripe", label: "Overripe", color: "#8f2418" },
];
const ENVS: { id: EnvironmentRating; label: string; color: string }[] = [
  { id: "favorable", label: "Favorable", color: "#22c55e" },
  { id: "monitor", label: "Monitor", color: "#eab308" },
  { id: "stressful", label: "Potentially Stressful", color: "#ef4444" },
];

function Panel({ title, icon, delay, children }: { title: string; icon: ReactNode; delay: number; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }} className="glass rounded-3xl p-5">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </p>
      {children}
    </motion.div>
  );
}

function Scale<T extends string>({ options, value, delay }: { options: { id: T; label: string; color: string }[]; value: T | null; delay: number }) {
  return (
    <div className={cn("grid gap-1.5", options.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <motion.div
            key={o.id}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: on ? 1 : 0.45, scale: on ? 1.03 : 1 }}
            transition={{ delay: delay + i * 0.05 }}
            className={cn("relative flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-3 text-center", on ? "border-transparent" : "border-border/50")}
            style={on ? { background: `${o.color}1f`, boxShadow: `0 0 0 1.5px ${o.color}` } : undefined}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: o.color, boxShadow: on ? `0 0 14px ${o.color}` : "none" }} />
            <span className={cn("text-[11px] font-semibold leading-tight", on ? "text-foreground" : "text-muted-foreground")}>{o.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ResultPanels({ result, reading, notice, preview }: { result: AnalysisResult; reading: SensorReading | null; notice?: string | null; preview?: string | null }) {
  const isBackend = result.source === "backend";
  const isAI = result.source === "ai" || isBackend;
  const ripe = result.ripeness === "unknown" || result.ripeness === "not_applicable" ? null : result.ripeness;
  return (
    <div className="grid gap-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", isAI ? "border-emerald-500/30 bg-emerald-500/10" : "border-gold-500/40 bg-gold-400/10")}
      >
        {isAI ? <Bot className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" />}
        <div className="text-sm">
          <p className="font-semibold">{isBackend ? "FolLand analysis · review limitations" : isAI ? `AI analysis · ${result.provider}` : "DEMO RESULT — not an AI analysis"}</p>
          <p className="text-foreground/70">{notice ?? (isBackend ? `Vision: ${result.provider}. Predictions are not diagnoses.` : isAI ? "A connected vision model analyzed this photo." : "Labels come from a simple color heuristic in your browser and are not diagnoses.")}</p>
        </div>
      </motion.div>

      {isBackend && result.detector?.status === "ok" && result.detector.detections.length > 0 && <Panel title="Harvest summary · AI predictions" icon={<Leaf className="h-3.5 w-3.5" />} delay={0}>
        <p className="text-sm">{result.detector.detections.filter(d => d.label === "ripe").length} apparently ripe · {result.detector.detections.filter(d => d.label === "half_ripe").length} half-ripe · {result.detector.detections.filter(d => d.label === "raw").length} unripe</p>
        <p className="mt-2 text-xs text-muted-foreground">Predictions need a physical check; color cannot establish exact ripeness or food safety.</p>
      </Panel>}
      {isBackend && result.recommendations?.map(card => <Panel key={card.category} title={card.category} icon={<CheckCircle2 className="h-3.5 w-3.5"/>} delay={0.06}>
        <h3 className="font-semibold">{card.title}</h3><p className="mt-2 text-sm">{card.recommendation}</p><p className="mt-2 text-sm"><strong>Next:</strong> {card.next_action}</p>
        <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">Limitations and sources</summary>{card.limitations.map((l,i)=><p key={i} className="mt-2">{l}</p>)}{card.references.map(ref=><a className="mt-2 block text-primary underline" key={ref.id} href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a>)}</details>
      </Panel>)}
      {isBackend && result.detector && <Panel title="Detected fruit" icon={<Leaf className="h-3.5 w-3.5" />} delay={0}>
        <p className="text-sm text-muted-foreground">{result.detector.message}</p>
        <p className="mt-2 text-sm font-semibold">{result.detector.status === "ok" ? `${result.detector.detections.length} candidate fruit` : `Detector ${result.detector.status}`}</p>
        {preview && result.detector.status === "ok" && result.detector.width && result.detector.height && <div className="relative mt-3 overflow-hidden rounded-xl"><img src={preview} alt="Tomato photo with detected fruit outlined" className="block h-auto w-full"/><svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${result.detector.width} ${result.detector.height}`} preserveAspectRatio="none" aria-hidden="true">{result.detector.detections.map((d,i) => { const size = Math.max(12, result.detector!.width! / 38); const x = Math.max(0, Math.min(d.box[0], result.detector!.width! - size * 1.7)); const y = Math.max(0, Math.min(d.box[1], result.detector!.height! - size * 1.25)); return <g key={i}><rect x={d.box[0]} y={d.box[1]} width={d.box[2]-d.box[0]} height={d.box[3]-d.box[1]} fill="none" stroke="#a5f36c" strokeWidth={Math.max(2,result.detector!.width!/300)}/><rect x={x} y={y} width={size * 1.7} height={size * 1.25} rx={size * 0.2} fill="#071d12" stroke="#a5f36c" strokeWidth={Math.max(1, size / 12)}/><text x={x + size * 0.85} y={y + size * 0.91} textAnchor="middle" fill="white" fontSize={size} fontWeight="bold">{i+1}</text></g>; })}</svg></div>}
        <p className="mt-3 text-xs text-muted-foreground">Scores are uncalibrated model outputs, not probabilities of correctness.</p><ul className="mt-3 space-y-1 text-sm">{result.detector.detections.map((d,i) => <li key={i}>Fruit {i+1}: {d.label.replace(/_/g," ")} · uncalibrated score {d.confidence.toFixed(2)}{d.uncertain ? " · uncertain" : ""}{d.raw_label !== d.label ? " · rotten check disagreed" : ""}</li>)}</ul>
        {result.disagreement && <p className="mt-2 text-sm text-amber-600">{result.disagreement}</p>}
      </Panel>}
      {isBackend && result.report && <Panel title="Farmer report" icon={<Bot className="h-3.5 w-3.5" />} delay={0.04}>
        <p className="text-xs font-semibold text-muted-foreground">{result.report.source === "gemini" ? `AI-generated report · ${result.report.model ?? "Gemini model unavailable"} — review against the evidence` : `Rule-based fallback · Gemini ${result.report.gemini_status.replace(/_/g," ")}`}</p>
        {result.report.sections && <><div className="my-4"><ReportTemplate result={result} sections={result.report.sections} /></div><button type="button" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()}>Print / Save as PDF</button></>}
        <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">View raw report</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{result.report.text}</p></details>
        <button type="button" className="mt-4 text-sm font-semibold text-primary hover:underline" onClick={() => { const u=URL.createObjectURL(new Blob([result.report!.text],{type:"text/plain"})); const a=document.createElement("a"); a.href=u; a.download="folland-report.txt"; a.click(); URL.revokeObjectURL(u); }}>Download report</button>
      </Panel>}
      <Panel title="Crop condition" icon={<Leaf className="h-3.5 w-3.5" />} delay={0.05}>
        <Scale options={CONDITIONS} value={result.cropCondition === "unknown" ? null : result.cropCondition} delay={0.1} />
        <ul className="mt-3 space-y-1 text-sm">
          {result.symptoms.map((s) => (
            <li key={s} className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{s}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="Fruit ripeness" icon={<span className="h-2.5 w-2.5 rounded-full bg-red-500" />} delay={0.12}>
        <Scale options={RIPENESS} value={ripe} delay={0.18} />
        {!ripe && (
          <p className="mt-3 text-sm text-muted-foreground">
            {result.ripeness === "not_applicable" ? "No fruit was detected in the photo; ripeness is not applicable." : "Ripeness could not be determined from this photo."}
          </p>
        )}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Model confidence</span>
            <span className="font-semibold">{result.confidence ? result.confidence.label : "Not available"}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            {result.confidence?.value != null && (
              <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-gold-400" initial={{ width: 0 }} animate={{ width: `${result.confidence.value * 100}%` }} transition={{ duration: 1, delay: 0.3 }} />
            )}
          </div>
          {!result.confidence && <p className="mt-1.5 text-[11px] text-muted-foreground">A calibrated confidence estimate is not available.</p>}
        </div>
      </Panel>

      <Panel title="Environmental conditions" icon={<Thermometer className="h-3.5 w-3.5" />} delay={0.19}>
        <Scale options={ENVS} value={result.environment} delay={0.25} />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { icon: Thermometer, v: reading ? `${reading.temperatureC.toFixed(1)}°C` : "—", l: "Air" },
            { icon: Droplets, v: reading ? `${reading.humidityPct.toFixed(0)}%` : "—", l: "RH" },
            { icon: Sun, v: reading?.lightLux != null ? formatLux(reading.lightLux) : "—", l: "Lux" },
          ].map((m) => (
            <div key={m.l} className="rounded-xl bg-foreground/[0.04] py-2">
              <m.icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
              <p className="num mt-0.5 text-sm font-semibold">{m.v}</p>
              <p className="text-[10px] text-muted-foreground">{m.l}</p>
            </div>
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {result.environmentNotes.map((n) => <li key={n}>• {n}</li>)}
        </ul>
        <OriginBadge origin={reading?.origin} className="mt-3" />
      </Panel>

      <Panel title="Suggestions" icon={<CheckCircle2 className="h-3.5 w-3.5" />} delay={0.26}>
        <ul className="space-y-2 text-sm">
          {result.suggestions.map((s) => (
            <li key={s} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{result.summary}</p>
      </Panel>
    </div>
  );
}
