"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { HEALTH_META, RIPENESS_META, SENSOR_NODES, WEATHER_STATION_POS, ZONES } from "@/lib/farm";
import { WEATHER_PROFILES, zoneReading } from "@/lib/simulation";
import type { ConnectionStatus, PlantState, SensorReading, WeatherCondition, ZoneId } from "@/lib/types";
import { formatLux } from "@/lib/utils";
import { FarmEnvironment, type TimeOfDay } from "./environment";
import { FarmGround } from "./farm-ground";
import { HealthRings, Hotspot, SensorNodeModel, WeatherStation, ZoneFrames } from "./farm-props";
import { PlantField, type PlantInput } from "./plant-field";

export interface FarmSceneProps {
  variant: "hero" | "twin";
  plants: PlantState[];
  condition: WeatherCondition;
  timeOfDay: TimeOfDay;
  quality: "high" | "lite";
  latest: SensorReading | null;
  connection: ConnectionStatus;
  interactive: boolean;
  reducedMotion?: boolean;
  selectedPlantId?: string | null;
  selectedZone?: ZoneId | "all";
  selectedSensorId?: string | null;
  healthOverlay?: boolean;
  showSensors?: boolean;
  onSelectPlant?: (id: string | null) => void;
  onSelectSensor?: (id: string | null) => void;
}

const WIND: Record<WeatherCondition, number> = { sunny: 0.035, cloudy: 0.055, rainy: 0.1 };

/* ------------------------------ Camera rig ------------------------------ */

function CameraRig({ variant, focus, interactive, reducedMotion }: { variant: "hero" | "twin"; focus: { key: string; target: THREE.Vector3; distance: number }; interactive: boolean; reducedMotion?: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const flight = useRef<{ target: THREE.Vector3; pos: THREE.Vector3 } | null>(null);
  const [userActive, setUserActive] = useState(false);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const dir = camera.position.clone().sub(c.target).normalize();
    const minY = variant === "hero" ? 0.26 : 0.4;
    if (dir.y < minY) dir.setY(minY).normalize();
    if (variant === "hero" && dir.y > 0.36) dir.setY(0.36).normalize();
    flight.current = { target: focus.target.clone(), pos: focus.target.clone().addScaledVector(dir, focus.distance) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.key]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const start = () => {
      flight.current = null;
      setUserActive(true);
    };
    const end = () => setUserActive(false);
    c.addEventListener("start", start);
    c.addEventListener("end", end);
    return () => {
      c.removeEventListener("start", start);
      c.removeEventListener("end", end);
    };
  }, []);

  useFrame((_, dt) => {
    const c = controls.current;
    const f = flight.current;
    if (!c || !f) return;
    const k = 1 - Math.exp(-dt * 2.6);
    c.target.lerp(f.target, k);
    camera.position.lerp(f.pos, k);
    if (camera.position.distanceTo(f.pos) < 0.05 && c.target.distanceTo(f.target) < 0.02) flight.current = null;
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={variant === "twin"}
      enableZoom={interactive}
      zoomSpeed={0.7}
      minDistance={variant === "twin" ? 2.5 : 8}
      maxDistance={variant === "twin" ? 32 : 26}
      maxPolarAngle={Math.PI / 2.15}
      minPolarAngle={0.2}
      autoRotate={variant === "hero" && !userActive && !reducedMotion}
      autoRotateSpeed={0.35}
    />
  );
}

/* ----------------------------- Hotspot card ----------------------------- */

function HotspotCard({ title, subtitle, rows, onClose, badge }: { title: string; subtitle: string; rows: [string, string][]; onClose: () => void; badge?: { text: string; color: string } }) {
  return (
    <div className="glass-strong absolute left-7 top-1/2 w-[232px] -translate-y-1/2 rounded-2xl p-3.5 text-left text-foreground animate-in fade-in-0 zoom-in-95 slide-in-from-left-2 duration-300">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold leading-tight">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-foreground/10" aria-label="Close details">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {badge && (
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${badge.color}22`, color: badge.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: badge.color }} />
          {badge.text}
        </span>
      )}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="num text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* --------------------------------- Scene --------------------------------- */

export function FarmScene(props: FarmSceneProps) {
  const {
    variant,
    plants,
    condition,
    timeOfDay,
    quality,
    latest,
    connection,
    interactive,
    reducedMotion,
    selectedPlantId = null,
    selectedZone = "all",
    selectedSensorId = null,
    healthOverlay = variant === "twin",
    showSensors = true,
    onSelectPlant,
    onSelectSensor,
  } = props;
  const [hovered, setHovered] = useState<string | null>(null);
  const [heroSpot, setHeroSpot] = useState<string | null>(null);
  const high = quality === "high";
  const wind = reducedMotion ? 0 : WIND[condition];

  const inputs: PlantInput[] = useMemo(
    () => plants.map((p) => ({ id: p.id, position: p.position, growth: p.growth, seed: p.seed, health: p.health })),
    // Geometry only depends on growth and health, not on every reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plants.map((p) => p.health).join("")],
  );

  const focus = useMemo(() => {
    const sel = plants.find((p) => p.id === selectedPlantId);
    if (variant === "twin" && sel) return { key: `p${sel.id}`, target: new THREE.Vector3(sel.position[0], 0.6, sel.position[2]), distance: 4.2 };
    const z = ZONES.find((zz) => zz.id === selectedZone);
    if (z) return { key: `z${z.id}`, target: new THREE.Vector3(z.center[0], 0.4, z.center[1]), distance: 9 };
    return { key: "all", target: new THREE.Vector3(0, 0.4, 0), distance: variant === "hero" ? 17 : 19 };
  }, [variant, plants, selectedPlantId, selectedZone]);

  // Featured plants for hero hotspots: the most mature plant in each zone.
  const featured = useMemo(
    () => ZONES.map((z) => plants.filter((p) => p.zone === z.id).sort((a, b) => b.growth - a.growth)[Math.floor(plants.length / 16)]).filter(Boolean),
    [plants],
  );

  const sensorRows = (zone: ZoneId): [string, string][] => {
    if (!latest) return [["Status", "Waiting for data"]];
    const z = zoneReading(latest, zone);
    return [
      ["Temperature", `${z.temperatureC.toFixed(1)} °C`],
      ["Humidity", `${z.humidityPct.toFixed(0)} %`],
      ["Light", z.lightLux == null ? "No sensor" : `${formatLux(z.lightLux)} lux`],
      ["Canopy dist.", latest.distanceCm == null ? "—" : `${latest.distanceCm.toFixed(1)} cm`],
    ];
  };
  const plantRows = (p: PlantState): [string, string][] => [
    ["Leaf temp", `${p.leafTempC.toFixed(1)} °C`],
    ["Humidity", `${p.localHumidityPct.toFixed(0)} %`],
    ["Light", latest?.lightLux == null ? "—" : `${formatLux(zoneReading(latest, p.zone).lightLux ?? 0)} lux`],
    ["Height", `${p.heightCm} cm`],
    ["Ripeness", p.ripeness ? `${RIPENESS_META[p.ripeness].label} · ${p.ripenessPct}%` : "Not fruiting"],
  ];
  const dataTag = latest?.origin === "live" ? "Live" : "Simulated";

  return (
    <>
      <FarmEnvironment condition={condition} timeOfDay={timeOfDay} quality={quality} animateSun={!reducedMotion} />
      <FarmGround plants={inputs} condition={condition} quality={quality} wind={wind} />
      <PlantField
        plants={inputs}
        detail={high ? 1 : 0.6}
        wind={wind}
        shadows={high}
        onSelect={variant === "twin" ? (id) => onSelectPlant?.(id) : undefined}
        onHover={setHovered}
      />
      <HealthRings plants={plants} visible={healthOverlay} selectedId={variant === "twin" ? selectedPlantId : null} hoveredId={hovered} selectedZone={selectedZone} />
      <ZoneFrames selectedZone={selectedZone} />
      {showSensors &&
        SENSOR_NODES.map((n) => (
          <SensorNodeModel
            key={n.id}
            node={n}
            status={connection}
            selected={selectedSensorId === n.id}
            onClick={variant === "twin" ? () => onSelectSensor?.(selectedSensorId === n.id ? null : n.id) : () => setHeroSpot(heroSpot === n.id ? null : n.id)}
          />
        ))}
      <WeatherStation condition={condition} position={WEATHER_STATION_POS} />
      <CameraRig variant={variant} focus={focus} interactive={interactive} reducedMotion={reducedMotion} />

      {variant === "hero" && (
        <>
          {SENSOR_NODES.map((n) => (
            <Hotspot
              key={n.id}
              position={[n.position[0], 1.45, n.position[2]]}
              label={n.label}
              active={heroSpot === n.id}
              onClick={() => setHeroSpot(heroSpot === n.id ? null : n.id)}
            >
              <HotspotCard
                title={n.label}
                subtitle={`Zone ${n.zone} · ${ZONES.find((z) => z.id === n.zone)?.name}`}
                rows={sensorRows(n.zone)}
                badge={{ text: `${dataTag} reading`, color: dataTag === "Live" ? "#34d399" : "#d8b865" }}
                onClose={() => setHeroSpot(null)}
              />
            </Hotspot>
          ))}
          {featured.map((p) => {
            const h = 0.35 + 1.55 * Math.pow(p.growth / 5, 0.85);
            const meta = HEALTH_META[p.health];
            return (
              <Hotspot
                key={p.id}
                position={[p.position[0], h + 0.25, p.position[2]]}
                label={`Plant ${p.id}`}
                tone={p.health === "healthy" ? "gold" : p.health === "attention" ? "yellow" : "red"}
                active={heroSpot === p.id}
                onClick={() => setHeroSpot(heroSpot === p.id ? null : p.id)}
              >
                <HotspotCard
                  title={`Tomato ${p.id}`}
                  subtitle={ZONES.find((z) => z.id === p.zone)?.focus ?? ""}
                  rows={plantRows(p)}
                  badge={{ text: meta.label, color: meta.color }}
                  onClose={() => setHeroSpot(null)}
                />
              </Hotspot>
            );
          })}
          <Hotspot position={[0, 2.95, 0]} label="Weather station" tone="gold" active={heroSpot === "station"} onClick={() => setHeroSpot(heroSpot === "station" ? null : "station")}>
            <HotspotCard
              title="Weather Station"
              subtitle="On-site microclimate"
              rows={
                latest
                  ? [
                      ["Sky", WEATHER_PROFILES[condition].label],
                      ["Air temp", `${latest.temperatureC.toFixed(1)} °C`],
                      ["Humidity", `${latest.humidityPct.toFixed(0)} %`],
                      ["Light", latest.lightLux == null ? "No sensor" : `${formatLux(latest.lightLux)} lux`],
                    ]
                  : [["Status", "Waiting for data"]]
              }
              badge={{ text: `${dataTag} reading`, color: dataTag === "Live" ? "#34d399" : "#d8b865" }}
              onClose={() => setHeroSpot(null)}
            />
          </Hotspot>
        </>
      )}
    </>
  );
}
