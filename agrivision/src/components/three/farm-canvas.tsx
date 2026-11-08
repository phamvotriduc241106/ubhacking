"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useQuality } from "@/hooks/use-quality";
import { usePlants } from "@/hooks/use-plants";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { FarmScene, type FarmSceneProps } from "./farm-scene";
import { SceneFallback, SceneLoader } from "./scene-fallback";
import { ContextLossGuard, SceneBoundary, SceneReady } from "./scene-runtime";

type Props = Pick<FarmSceneProps, "variant" | "onSelectPlant" | "onSelectSensor" | "selectedSensorId"> & {
  className?: string;
};

export default function FarmCanvas({ variant, className, onSelectPlant, onSelectSensor, selectedSensorId }: Props) {
  const { quality, ready, reducedMotion } = useQuality();
  const { resolvedTheme } = useTheme();
  const plants = usePlants();
  const latest = useApp((s) => s.latest);
  const condition = useApp((s) => s.condition);
  const connection = useApp((s) => s.connection);
  const selectedPlantId = useApp((s) => s.selectedPlantId);
  const selectedZone = useApp((s) => s.selectedZone);
  const healthOverlay = useApp((s) => s.healthOverlay);
  const showSensors = useApp((s) => s.showSensors);

  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);
  // Pixel-ratio penalty applied by the performance monitor (0 = full resolution).
  const [dprPenalty, setDprPenalty] = useState(0);
  // Bumped to remount the canvas after a lost WebGL context or a crash.
  const [generation, setGeneration] = useState(0);
  const remount = useCallback(() => {
    setLoaded(false);
    setGeneration((g) => g + 1);
  }, []);
  const onReady = useCallback(() => setLoaded(true), []);
  // Hero: wheel-zoom only after the visitor clicks into the scene, so page scrolling still works.
  const [engaged, setEngaged] = useState(variant === "twin");

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!ready) return <div className={cn("relative h-full w-full", className)}><SceneLoader /></div>;
  if (quality === "none") return <div className={cn("relative h-full w-full", className)}><SceneFallback /></div>;

  const high = quality === "high";
  const maxDpr = Math.min(high ? 1.75 : 1.5, window.devicePixelRatio || 1);
  const dpr = Math.max(1, maxDpr - dprPenalty);
  return (
    <div
      ref={wrap}
      className={cn("relative h-full w-full", className)}
      onPointerDown={() => setEngaged(true)}
      onPointerLeave={() => variant === "hero" && setEngaged(false)}
    >
      <SceneBoundary onRetry={remount}>
      <Canvas
        key={`${quality}-${generation}`}
        shadows={high}
        dpr={dpr}
        frameloop={visible ? "always" : "never"}
        camera={{ position: variant === "hero" ? [13.5, 5.2, 13.5] : [13, 10, 14], fov: variant === "hero" ? 38 : 42, near: 0.1, far: 200 }}
        gl={{ antialias: high, powerPreference: "high-performance", alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onPointerMissed={() => variant === "twin" && onSelectPlant?.(null)}
      >
        {high && (
          <PerformanceMonitor
            onDecline={() => setDprPenalty((p) => Math.min(maxDpr - 1, p + 0.25))}
            onIncline={() => setDprPenalty((p) => Math.max(0, p - 0.25))}
            flipflops={3}
          />
        )}
        <FarmScene
          variant={variant}
          plants={plants}
          condition={condition}
          timeOfDay={resolvedTheme === "light" ? "day" : "dusk"}
          quality={quality}
          latest={latest}
          connection={connection}
          interactive={engaged}
          reducedMotion={reducedMotion}
          selectedPlantId={selectedPlantId}
          selectedZone={selectedZone}
          selectedSensorId={selectedSensorId}
          healthOverlay={variant === "twin" ? healthOverlay : false}
          showSensors={variant === "twin" ? showSensors : true}
          onSelectPlant={onSelectPlant}
          onSelectSensor={onSelectSensor}
        />
        <SceneReady onReady={onReady} />
        <ContextLossGuard onLost={remount} />
      </Canvas>
      </SceneBoundary>
      <SceneLoader hidden={loaded} />
    </div>
  );
}
