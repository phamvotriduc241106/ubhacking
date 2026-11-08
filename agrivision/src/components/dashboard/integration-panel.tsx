"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { CheckCircle2, CircleAlert, Cpu, FlaskConical, Loader2, PlugZap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchLiveReading } from "@/lib/sensors-live";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function IntegrationPanel() {
  const mode = useApp((s) => s.mode);
  const setMode = useApp((s) => s.setMode);
  const endpoint = useApp((s) => s.liveEndpoint);
  const pollMs = useApp((s) => s.pollMs);
  const setLiveConfig = useApp((s) => s.setLiveConfig);
  const connection = useApp((s) => s.connection);
  const message = useApp((s) => s.connectionMessage);
  const latest = useApp((s) => s.latest);

  const [draft, setDraft] = useState(endpoint);
  const [poll, setPoll] = useState(String(pollMs / 1000));
  const [test, setTest] = useState<{ state: "idle" | "testing" | "ok" | "fail"; text?: string }>({ state: "idle" });

  const runTest = async () => {
    setTest({ state: "testing" });
    try {
      const r = await fetchLiveReading(draft, "sunny", AbortSignal.timeout(6000));
      setTest({
        state: "ok",
        text: `${r.temperatureC.toFixed(1)} °C · ${r.humidityPct.toFixed(0)}% RH${r.lightLux != null ? ` · ${r.lightLux} lux` : ""} — ${r.origin === "live" ? "reports live hardware" : "reports simulated data"}`,
      });
    } catch (e) {
      setTest({ state: "fail", text: e instanceof Error ? e.message : "Request failed" });
    }
  };

  const apply = () => {
    setLiveConfig({ liveEndpoint: draft.trim(), pollMs: Math.max(1, Number(poll) || 5) * 1000 });
    if (mode !== "live") setMode("live");
  };

  return (
    <Card id="integration" className="scroll-mt-28">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle><Localized id="ui_548c5b4d99727c76" fallback="Data source" /></CardTitle>
            <CardDescription><Localized id="ui_f3d310edcbd8bd88" fallback="Use realistic demo data, or connect a sensor endpoint." /></CardDescription>
          </div>
          <div className="glass inline-flex rounded-full p-1" role="radiogroup" aria-label="Data source">
            {[
              { id: "demo" as const, label: "Demo Mode", icon: FlaskConical },
              { id: "live" as const, label: "Integration", icon: PlugZap },
            ].map((o) => (
              <button
                key={o.id}
                role="radio"
                aria-checked={mode === o.id}
                onClick={() => (o.id === "live" ? apply() : setMode("demo"))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                  mode === o.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <o.icon className="h-3.5 w-3.5" />
                <LocalizedText text={o.label} />
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-foreground/[0.04] p-3.5">
            {mode === "demo" ? (
              <>
                <FlaskConical className="h-5 w-5 shrink-0 text-gold-500" />
                <p className="text-sm">
                  <strong><Localized id="ui_d675f97155558e39" fallback="Demo Mode is on." /></strong>{" "}<Localized id="ui_c65ac92861803e33" fallback="Readings are simulated in your browser from a diurnal model of a summer tomato bed, adjusted by the selected weather." /></p>
              </>
            ) : connection === "connected" ? (
              <>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm">
                  <strong><Localized id="ui_5a61f6308c4e8ab5" fallback="Connected." /></strong> {latest?.origin === "live" ? "Receiving live readings." : "The endpoint says its data is simulated, so readings are labeled that way."}
                </p>
              </>
            ) : connection === "connecting" ? (
              <>
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-yellow-500" />
                <p className="text-sm"><Localized id="ui_86ea8896a440a667" fallback="Connecting to" />{" "}<code className="text-xs">{endpoint}</code>…</p>
              </>
            ) : (
              <>
                <CircleAlert className="h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm">
                  <strong><Localized id="ui_5118ec56d3b0c4c6" fallback="No data." /></strong> {message}<Localized id="ui_7caccdd3329c2799" fallback=". Nothing is simulated in Integration Mode, so cards stay empty until the endpoint responds." /></p>
              </>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label htmlFor="endpoint"><Localized id="ui_71e64a21391fed91" fallback="Sensor endpoint (GET, JSON)" /></Label>
              <Input id="endpoint" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="http://raspberrypi.local:8080/latest" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poll"><Localized id="ui_e52bf24de9ec5503" fallback="Poll every (s)" /></Label>
              <Input id="poll" type="number" min={1} value={poll} onChange={(e) => setPoll(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={runTest} disabled={test.state === "testing"}>
              {test.state === "testing" ? <Loader2 className="animate-spin" /> : <Cpu />}<Localized id="ui_5bcf311b19d80c56" fallback="Test connection" /></Button>
            <Button size="sm" onClick={apply}>
              <PlugZap />{" "}<Localized id="ui_cc39cc9cf27d1d00" fallback="Save & connect" /></Button>
            {test.state === "ok" && <Badge variant="live">✓ <LocalizedText text={test.text} /></Badge>}
            {test.state === "fail" && <Badge variant="critical">✕ <LocalizedText text={test.text} /></Badge>}
          </div>
          <p className="text-xs text-muted-foreground"><Localized id="ui_863ae5e127effd16" fallback="The default" />{" "}<code>/api/folland/sensors/latest</code>{" "}<Localized id="ui_f60bb2b8db989985" fallback="goes through this app to the FolLand FastAPI backend on port 8000. That backend currently serves simulated METRO 328 readings, so they are labeled “Backend · simulated”." /></p>
        </div>
        <div className="rounded-2xl bg-charcoal-900 p-4 font-mono text-[11.5px] leading-relaxed text-sage-200 dark:bg-black/40">
          <p className="mb-2 font-sans text-xs font-semibold text-cream-100"><Localized id="ui_ba05d692e44b6327" fallback="Expected payload" /></p>
          <pre className="whitespace-pre-wrap">{`{
  "temperatureC": 24.1,
  "humidityPct": 61,
  "lightLux": 32000,      // optional
  "distanceCm": 33.5,     // optional
  "canopyHeightCm": 16.5, // optional
  "live": true            // true = real hardware
}`}</pre>
          <p className="mt-3 font-sans text-[11px] text-sage-400"><Localized id="ui_dc4833a73330b167" fallback="FolLand’s" />{" "}<code>air_temperature_c</code> / <code>data_mode</code>{" "}<Localized id="ui_0ca1e9bb106dbd46" fallback="fields are also accepted." /></p>
        </div>
      </CardContent>
    </Card>
  );
}
