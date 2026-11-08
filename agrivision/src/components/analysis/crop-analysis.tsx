"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Camera, FlaskConical, ImagePlus, Loader2, RefreshCw, ScanSearch, Server, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aiAnalysis, checkBackend, demoAnalysis, measureColors, type BackendStatus } from "@/lib/analysis";
import { useApp } from "@/lib/store";
import type { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ResultPanels } from "./result-panels";

type Engine = "ai" | "demo";
const MAX_MB = 15;

export function CropAnalysis() {
  const { t } = useTranslation();
  const latest = useApp((s) => s.latest);
  const thresholds = useApp((s) => s.thresholds);
  const setAnalysis = useApp((s) => s.setAnalysis);
  const last = useApp((s) => s.lastAnalysis);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [engine, setEngine] = useState<Engine>("demo");
  const [soil, setSoil] = useState("unknown");
  const [backend, setBackend] = useState<BackendStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(last);
  const input = useRef<HTMLInputElement>(null);

  const probe = useCallback(async () => {
    setBackend(null);
    const s = await checkBackend(AbortSignal.timeout(4000));
    setBackend(s);
    if (s.reachable) setEngine("ai");
  }, []);
  useEffect(() => {
    probe();
  }, [probe]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const accept = (f: File | undefined | null) => {
    if (!f) return;
    setError(null);
    if (!f.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic)$/i.test(f.name)) {
      setError("Please choose an image file (JPEG, PNG, WebP or HEIC).");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`That image is ${(f.size / 1048576).toFixed(1)} MB; the limit is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setNotice(null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const started = Date.now();
    try {
      let r: AnalysisResult | null = null;
      if (engine === "ai") {
        try {
          r = await aiAnalysis(file, soil, latest, thresholds);
        } catch (e) {
          throw new Error(e instanceof Error ? e.message : "Backend analysis failed.");
        }
      }
      if (!r) {
        const stats = await measureColors(file);
        r = demoAnalysis(file, stats, latest, thresholds);
      }
      // Keep the scanning animation visible for a moment so the transition reads clearly.
      const wait = 1100 - (Date.now() - started);
      if (wait > 0) await new Promise((res) => setTimeout(res, wait));
      setResult(r);
      setAnalysis(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setNotice(null);
    setError(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Computer vision"
        title={<><Localized id="ui_f0ffb2082d9bc61b" fallback="AI Crop" />{" "}<span className="text-gradient"><Localized id="ui_6a294cb4bdd338ef" fallback="Health Analysis" /></span></>}
        description="Upload a photo of a tomato plant or fruit. See visible symptoms, ripeness and actionable suggestions, alongside available microclimate readings."
      />
      <div className="container mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                accept(e.dataTransfer.files?.[0]);
              }}
              className={cn("relative m-3 grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors", drag ? "border-primary bg-primary/10" : "border-border/70 bg-foreground/[0.02]")}
            >
              {preview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Uploaded plant preview" className="absolute inset-0 h-full w-full object-cover" />
                  <AnimatePresence>
                    {busy && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-forest-950/40">
                        <motion.div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent" initial={{ top: "-25%" }} animate={{ top: "100%" }} transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }} />
                        <div className="absolute inset-4 rounded-xl border border-emerald-300/50" />
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className={cn("absolute h-6 w-6 border-emerald-300", ["left-4 top-4 border-l-2 border-t-2", "right-4 top-4 border-r-2 border-t-2", "bottom-4 left-4 border-b-2 border-l-2", "bottom-4 right-4 border-b-2 border-r-2"][i])} />
                        ))}
                        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">
                          {engine === "ai" ? "Analyzing with AI model…" : "Measuring color distribution…"}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary animate-float">
                    <ImagePlus className="h-7 w-7" />
                  </span>
                  <p className="font-display text-lg font-semibold"><Localized id="ui_2c105d63f7aaf5aa" fallback="Drop a tomato photo here" /></p>
                  <p className="text-sm text-muted-foreground"><Localized id="ui_5fb77c65334c87af" fallback="JPEG, PNG, WebP or HEIC · up to" />{" "}{MAX_MB} MB</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={() => input.current?.click()}><Upload />{" "}<Localized id="ui_9c5bb7ae0e7da3f4" fallback="Choose photo" /></Button>
                    <Button size="sm" variant="outline" asChild>
                      <label className="cursor-pointer">
                        <Camera />{" "}<Localized id="ui_7100ac9979a623d5" fallback="Take photo" /><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => accept(e.target.files?.[0])} />
                      </label>
                    </Button>
                  </div>
                </div>
              )}
              <input ref={input} type="file" accept="image/*,.heic" className="sr-only" onChange={(e) => accept(e.target.files?.[0])} />
            </div>
            {file && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4 text-sm">
                <span className="truncate text-muted-foreground">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => input.current?.click()} disabled={busy}><RefreshCw />{" "}<Localized id="ui_95e154398a4bc009" fallback="Replace" /></Button>
                  <Button size="sm" variant="ghost" onClick={clear} disabled={busy}><Trash2 />{" "}<Localized id="ui_c3812fc4acb861d5" fallback="Remove" /></Button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><Localized id="ui_b6e9df2095d086f5" fallback="Analysis engine" /></CardTitle>
              <CardDescription><Localized id="ui_008a58650781730d" fallback="Use the connected backend for model analysis, or explicitly select the demo heuristic." /></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { id: "ai" as const, icon: Bot, title: "AI vision model", text: "Local model + optional Gemini", disabled: !backend?.reachable },
                  { id: "demo" as const, icon: FlaskConical, title: "Demo heuristic", text: "Pixel-color rules in your browser. Not AI.", disabled: false },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => !o.disabled && setEngine(o.id)}
                    disabled={o.disabled}
                    aria-pressed={engine === o.id}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                      engine === o.id ? "border-primary/60 bg-primary/10 glow-ring" : "border-border/60 hover:bg-foreground/[0.03]",
                    )}
                  >
                    <o.icon className={cn("mt-0.5 h-5 w-5 shrink-0", o.id === "ai" ? "text-emerald-500" : "text-gold-500")} />
                    <span>
                      <span className="block text-sm font-semibold"><LocalizedText text={o.title} /></span>
                      <span className="block text-xs text-muted-foreground"><LocalizedText text={o.text} /></span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-foreground/[0.04] px-3 py-2 text-xs">
                <span className="flex items-center gap-2">
                  <Server className="h-3.5 w-3.5" />
                  {backend == null ? "Checking AI backend…" : backend.reachable ? "FolLand backend reachable" : "AI backend not running — demo heuristic only"}
                </span>
                <button onClick={probe} className="font-medium text-primary hover:underline"><Localized id="ui_1f47d8366934f024" fallback="Recheck" /></button>
              </div>
              {engine === "ai" && (
                <div className="space-y-2 text-sm">
                  <label htmlFor="soil" className="font-medium">{t("soil")}</label>
                  <select id="soil" value={soil} onChange={(e) => setSoil(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2">
                    <option value="unknown">{t("unknown")}</option><option value="dry_at_5cm">{t("dry")}</option><option value="moist">{t("moist")}</option><option value="wet">{t("wet")}</option>
                  </select>
                  <p className="text-xs text-muted-foreground"><Localized id="ui_231453f9ee300d6f" fallback="Gemini is configured on the server. When enabled, photos are sent to Google. No key is needed in the browser." /></p>
                </div>
              )}
              <Button className="w-full" size="lg" onClick={run} disabled={!file || busy}>
                {busy ? <Loader2 className="animate-spin" /> : <ScanSearch />}
                {busy ? t("loading") : engine === "ai" ? t("analyze") : "Run demo analysis"}
              </Button>
              {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
            </CardContent>
          </Card>
        </div>

        <div>
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key={result.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ResultPanels result={result} reading={result.source === "backend" ? result.analysisSensor ?? null : latest} notice={notice} preview={preview} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass grid h-full min-h-[420px] place-items-center rounded-3xl p-8 text-center">
                <div className="max-w-sm space-y-3">
                  <ScanSearch className="mx-auto h-10 w-10 text-primary/70" />
                  <h3 className="text-xl font-semibold"><Localized id="ui_1aabd487707fdebd" fallback="Results appear here" /></h3>
                  <p className="text-sm text-muted-foreground"><Localized id="ui_1a41c1c62c4ccb50" fallback="You will see available observations, model results, environmental context and a report." /></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
