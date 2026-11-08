"use client";

import { Localized, LocalizedText } from "@/i18n/localized";
import { Eye, Layers, Radio } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { PageHeader } from "@/components/shared/section-heading";
import { WeatherSwitcher } from "@/components/shared/weather-switcher";
import { SceneLoader } from "@/components/three/scene-fallback";
import { Switch } from "@/components/ui/switch";
import { usePlants } from "@/hooks/use-plants";
import { useQuality } from "@/hooks/use-quality";
import { HEALTH_META, ZONES } from "@/lib/farm";
import { useApp } from "@/lib/store";
import type { HealthStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FarmInspector } from "./farm-inspector";

const FarmCanvas = dynamic(() => import("@/components/three/farm-canvas"), { ssr: false, loading: () => <SceneLoader /> });

export function FarmTwin() {
  const plants = usePlants();
  const zone = useApp((s) => s.selectedZone);
  const setZone = useApp((s) => s.setZone);
  const selectPlant = useApp((s) => s.selectPlant);
  const overlay = useApp((s) => s.healthOverlay);
  const setOverlay = useApp((s) => s.setHealthOverlay);
  const sensors = useApp((s) => s.showSensors);
  const setSensors = useApp((s) => s.setShowSensors);
  const quality = useApp((s) => s.quality);
  const setQuality = useApp((s) => s.setQuality);
  const { quality: active } = useQuality();
  const [sensorId, setSensorId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow="Digital twin"
        title={<><Localized id="ui_80d121163c972ea8" fallback="Smart Farm" />{" "}<span className="text-gradient"><Localized id="ui_472e0a91cc92fbcc" fallback="Digital Twin" /></span></>}
        description="A living 3D model of 48 tomato plants across four zones. Orbit, zoom and click to inspect any plant or sensor node."
      >
        <WeatherSwitcher />
      </PageHeader>

      <div className="container mt-8 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="relative h-[62vh] min-h-[460px] overflow-hidden rounded-3xl border border-border/60 shadow-2xl lg:h-[72vh]">
          <FarmCanvas
            variant="twin"
            onSelectPlant={(id) => {
              selectPlant(id);
              if (id) setSensorId(null);
            }}
            onSelectSensor={(id) => {
              setSensorId(id);
              if (id) selectPlant(null);
            }}
            selectedSensorId={sensorId}
          />
          {/* toolbar */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
            <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1" role="radiogroup" aria-label="Farm zone">
              <Layers className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              {(["all", ...ZONES.map((z) => z.id)] as const).map((z) => (
                <button
                  key={z}
                  role="radio"
                  aria-checked={zone === z}
                  onClick={() => setZone(z)}
                  className={cn("rounded-full px-3 py-1 text-xs font-semibold transition-all", zone === z ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {z === "all" ? "All" : `Zone ${z}`}
                </button>
              ))}
            </div>
            <div className="glass pointer-events-auto flex items-center gap-3 rounded-full px-3 py-1.5 text-xs">
              <label className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />{" "}<Localized id="ui_55898449eb74fb2e" fallback="Health" /><Switch checked={overlay} onCheckedChange={setOverlay} aria-label="Health overlay" className="scale-90" />
              </label>
              <label className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5" />{" "}<Localized id="ui_76140e34f635bb94" fallback="Sensors" /><Switch checked={sensors} onCheckedChange={setSensors} aria-label="Show sensors" className="scale-90" />
              </label>
            </div>
          </div>
          {/* legend */}
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
            <div className="glass pointer-events-auto flex flex-wrap items-center gap-3 rounded-full px-3.5 py-1.5 text-[11px]">
              {(Object.keys(HEALTH_META) as HealthStatus[]).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white/30" style={{ background: HEALTH_META[k].color }} />
                  <LocalizedText text={HEALTH_META[k].label} />
                </span>
              ))}
            </div>
            <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1 text-[11px]">
              {(["auto", "high", "lite"] as const).map((q) => (
                <button key={q} onClick={() => setQuality(q)} className={cn("rounded-full px-2.5 py-0.5 font-medium capitalize", quality === q ? "bg-foreground/10 text-foreground" : "text-muted-foreground")}>
                  {q === "auto" ? `Auto (${active})` : q}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:h-[72vh]">
          <FarmInspector plants={plants} sensorId={sensorId} onSensor={setSensorId} />
        </div>
      </div>
    </div>
  );
}
