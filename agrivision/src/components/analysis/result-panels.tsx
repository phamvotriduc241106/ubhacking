"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { motion } from "framer-motion";
import { Bot, CheckCircle2, ChevronRight, Droplets, FlaskConical, Leaf, Sun, Thermometer } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { OriginBadge } from "@/components/shared/origin-badge";
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
        {icon} <LocalizedText text={title} />
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
            <span className={cn("text-[11px] font-semibold leading-tight", on ? "text-foreground" : "text-muted-foreground")}><LocalizedText text={o.label} /></span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ResultPanels({ result, reading, notice, preview }: { result: AnalysisResult; reading: SensorReading | null; notice?: string | null; preview?: string | null }) {
  const {t, i18n}=useTranslation();
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
          <p className="text-foreground/70">{notice ?? (isBackend ? "Model and report availability are shown below; predictions are not diagnoses." : isAI ? "A connected vision model analyzed this photo." : "Labels come from a simple color heuristic in your browser and are not diagnoses.")}</p>
        </div>
      </motion.div>

      {isBackend && result.detector && <Panel title="Detected fruit" icon={<Leaf className="h-3.5 w-3.5" />} delay={0}>
        <p className="text-sm text-muted-foreground"><LocalizedText text={result.detector.message} /></p>
        <p className="mt-2 text-sm font-semibold">{result.detector.status === "ok" ? `${result.detector.detections.length} candidate fruit` : `Detector ${result.detector.status}`}</p>
        {preview && result.detector.status === "ok" && result.detector.width && result.detector.height && <div className="relative mt-3 overflow-hidden rounded-xl">
          <img src={preview} alt="Tomato photo with numbered detected fruit outlined" className="block h-auto w-full"/>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${result.detector.width} ${result.detector.height}`} preserveAspectRatio="none" aria-hidden="true">
            {result.detector.detections.map((d,i) => <rect key={i} x={d.box[0]} y={d.box[1]} width={d.box[2]-d.box[0]} height={d.box[3]-d.box[1]} fill="none" stroke="#a5f36c" strokeWidth={Math.max(2,result.detector!.width!/300)}/>)}
            {result.detector.detections.map((d,i) => {
              const width = result.detector!.width!;
              const height = result.detector!.height!;
              const size = Math.min(width * 0.035, height * 0.06);
              const labelWidth = size * (i >= 9 ? 1.45 : 1);
              const x = Math.max(0, Math.min(d.box[0], width - labelWidth));
              const y = Math.max(0, Math.min(d.box[1], height - size));
              return <g key={i}><rect x={x} y={y} width={labelWidth} height={size} rx={size * 0.16} fill="#102719" stroke="#a5f36c" strokeWidth={size * 0.06}/><text x={x + labelWidth / 2} y={y + size / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={size * 0.7} fontWeight="700">{i + 1}</text></g>;
            })}
          </svg>
        </div>}
        <ul className="mt-3 space-y-1 text-sm">{result.detector.detections.map((d,i) => <li key={i}><Localized id="ui_779089b3f7575162" fallback="Fruit" />{" "}{i+1}: {d.label.replace(/_/g," ")}{" "}<Localized id="ui_6855d3ce8a647bab" fallback="· model score" />{" "}{(d.confidence*100).toFixed(0)}%{d.uncertain ? " · uncertain" : ""}{d.raw_label !== d.label ? " · rotten check disagreed" : ""}</li>)}</ul>
        {result.disagreement && <p className="mt-2 text-sm text-amber-600">{result.disagreement}</p>}
      </Panel>}
      {isBackend && result.report && <Panel title={t("report")} icon={<Bot className="h-3.5 w-3.5" />} delay={0.04}>
        <p className="text-xs font-semibold text-muted-foreground">{result.report.source === "gemini" ? "Gemini-generated report — review against evidence below" : `Rule-based fallback · Gemini ${result.report.gemini_status.replace(/_/g," ")}`}</p>
        {result.report.locale !== i18n.language && <p className="mt-2 text-xs text-amber-600">{t("report_original")} ({result.report.locale})</p>}
        {result.report.translation_method === "machine_template" && <p className="mt-2 text-xs text-amber-600">{t("machine_notice")}</p>}
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" lang={result.report.locale} dir={result.report.locale === "ar" ? "rtl" : "ltr"}>{result.report.text}</p>
        {result.report.original_text && <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">{t("original_report")}</summary><p className="mt-2 whitespace-pre-wrap" lang="en" dir="ltr">{result.report.original_text}</p></details>}
        <button type="button" className="mt-4 text-sm font-semibold text-primary hover:underline" onClick={() => { const original = result.report!.original_text ? `\n\nEnglish original:\n${result.report!.original_text}` : ""; const u=URL.createObjectURL(new Blob([`FolLand\nSource: ${result.report!.source}\nLanguage: ${result.report!.locale}\n\n${result.report!.text}${original}`],{type:"text/plain;charset=utf-8"})); const a=document.createElement("a"); a.href=u; a.download="folland-report.txt"; a.click(); URL.revokeObjectURL(u); }}>{t("download")}</button>
      </Panel>}
      {isBackend && result.recommendations?.map(card => <Panel key={card.category} title={card.category} icon={<CheckCircle2 className="h-3.5 w-3.5"/>} delay={0.06}>
        {i18n.language !== "en" && <p className="mb-2 text-xs text-amber-600">{t("machine_notice")}</p>}
        <h3 className="font-semibold"><LocalizedText text={card.title} /></h3><p className="mt-2 text-sm"><LocalizedText text={card.recommendation} /></p><p className="mt-2 text-sm"><strong><Localized id="ui_5693e770dd678bff" fallback="Next:" /></strong> <LocalizedText text={card.next_action} /></p>
        {i18n.language !== "en" && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">{t("original_report")}</summary><div lang="en" dir="ltr"><p>{card.title}</p><p>{card.recommendation}</p><p>{card.next_action}</p></div></details>}
        <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer"><Localized id="ui_040bcb5dc98eae44" fallback="Limitations and sources" /></summary>{card.limitations.map((l,i)=><p key={i} className="mt-2"><LocalizedText text={l} /></p>)}{card.references.map(ref=><a className="mt-2 block text-primary underline" key={ref.id} href={ref.url} target="_blank" rel="noreferrer"><LocalizedText text={ref.title} /></a>)}</details>
      </Panel>)}
      <Panel title="Crop condition" icon={<Leaf className="h-3.5 w-3.5" />} delay={0.05}>
        <Scale options={CONDITIONS} value={result.cropCondition === "unknown" ? null : result.cropCondition} delay={0.1} />
        <ul className="mt-3 space-y-1 text-sm">
          {result.symptoms.map((s) => (
            <li key={s} className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><LocalizedText text={s} /></li>
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
            <span className="text-muted-foreground"><Localized id="ui_767a85943d41adfd" fallback="Model confidence" /></span>
            <span className="font-semibold">{result.confidence ? result.confidence.label : "Not available"}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            {result.confidence?.value != null && (
              <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-gold-400" initial={{ width: 0 }} animate={{ width: `${result.confidence.value * 100}%` }} transition={{ duration: 1, delay: 0.3 }} />
            )}
          </div>
          {!result.confidence && <p className="mt-1.5 text-[11px] text-muted-foreground"><Localized id="ui_e901ec6bb5fc58b6" fallback="The demo heuristic does not produce a calibrated confidence score." /></p>}
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
          {result.environmentNotes.map((n) => <li key={n}>• <LocalizedText text={n} /></li>)}
        </ul>
        <OriginBadge origin={reading?.origin} className="mt-3" />
      </Panel>

      <Panel title="Suggestions" icon={<CheckCircle2 className="h-3.5 w-3.5" />} delay={0.26}>
        <ul className="space-y-2 text-sm">
          {result.suggestions.map((s) => (
            <li key={s} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><LocalizedText text={s} /></li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground"><LocalizedText text={result.summary} /></p>
      </Panel>
    </div>
  );
}
