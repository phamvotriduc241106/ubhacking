"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { animate } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useQuality } from "@/hooks/use-quality";
import { getNoiseTexture } from "./geometries";
import { PlantField } from "./plant-field";
import { SceneFallback, SceneLoader } from "./scene-fallback";
import { ContextLossGuard, SceneBoundary, SceneReady } from "./scene-runtime";

function plantHeight(g: number) {
  return 0.1 + 1.55 * Math.pow(Math.max(0, g) / 5, 0.85);
}

function Rig({ growth }: { growth: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const reframeUntil = useRef(0);
  const last = useRef(growth);
  useFrame(({ clock }, dt) => {
    const c = controls.current;
    if (!c) return;
    if (Math.abs(last.current - growth) > 0.001) {
      last.current = growth;
      reframeUntil.current = clock.elapsedTime + 1.4;
    }
    const h = plantHeight(growth);
    const k = 1 - Math.exp(-dt * 2.2);
    c.target.lerp(new THREE.Vector3(0, h * 0.5 + 0.15, 0), k);
    // Reframe for the plant's new size only briefly after a change, so manual zoom still works.
    if (clock.elapsedTime < reframeUntil.current || clock.elapsedTime < 1.5) {
      const want = 1.1 + h * 1.55;
      const dir = camera.position.clone().sub(c.target).normalize();
      const d = camera.position.distanceTo(c.target);
      camera.position.copy(c.target).addScaledVector(dir, THREE.MathUtils.lerp(d, want, k));
    }
    c.update();
  });
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping autoRotate autoRotateSpeed={0.8} minDistance={0.8} maxDistance={6} maxPolarAngle={Math.PI / 2.05} />;
}

function Planter() {
  const soil = useMemo(() => {
    return getNoiseTexture([70, 50, 34], 38, 128, 0.14, 11, [2, 2]);
  }, []);
  return (
    <group>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.55, 0.18, 48]} />
        <meshStandardMaterial color="#d9cfb8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.181, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[0.58, 48]} />
        <meshStandardMaterial map={soil} roughness={1} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.6, 0.025, 10, 64]} />
        <meshStandardMaterial color="#c9a54c" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function GrowthCanvas({ growth }: { growth: number }) {
  const { quality, ready, reducedMotion } = useQuality();
  const [shown, setShown] = useState(growth);
  const [loaded, setLoaded] = useState(false);
  const [generation, setGeneration] = useState(0);
  const remount = useCallback(() => {
    setLoaded(false);
    setGeneration((g) => g + 1);
  }, []);
  const onReady = useCallback(() => setLoaded(true), []);

  useEffect(() => {
    if (reducedMotion) {
      setShown(growth);
      return;
    }
    const c = animate(shown, growth, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown((prev) => (Math.abs(prev - v) > 0.015 ? v : prev)),
      onComplete: () => setShown(growth),
    });
    return c.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growth, reducedMotion]);

  const plants = useMemo(() => [{ id: "demo", position: [0, 0.18, 0] as [number, number, number], growth: shown, seed: 1234, health: "healthy" as const }], [shown]);

  if (!ready) return <SceneLoader />;
  if (quality === "none") return <SceneFallback />;
  const high = quality === "high";

  return (
    <div className="relative h-full w-full">
      <SceneBoundary onRetry={remount}>
      <Canvas
        key={generation}
        shadows={high}
        dpr={high ? [1, 1.75] : 1}
        camera={{ position: [2.3, 1.5, 2.6], fov: 35 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <hemisphereLight args={["#f4f9ff", "#3b4a2a", 0.9]} />
        <directionalLight position={[3, 5, 2]} intensity={2.4} castShadow={high} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} color="#fff3dc" />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#bfe9d4" />
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={2} position={[0, 4, -5]} scale={[8, 4, 1]} color="#fff8ea" />
          <Lightformer intensity={0.8} position={[5, 2, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color="#d8f3e4" />
        </Environment>
        <Planter />
        <PlantField plants={plants} wind={reducedMotion ? 0 : 0.03} shadows={high} />
        {/* Contact shadows re-render the scene twice per frame by default. Render once per
            growth step instead; the planter is static and sway is too small to matter. */}
        <ContactShadows key={Math.round(shown * 2)} frames={1} position={[0, 0, 0]} opacity={0.45} scale={4} blur={2.4} far={2} />
        <Rig growth={shown} />
        <SceneReady onReady={onReady} />
        <ContextLossGuard onLost={remount} />
      </Canvas>
      </SceneBoundary>
      <SceneLoader hidden={loaded} />
    </div>
  );
}
