"use client";

import { HotspotOverlay } from "./hotspot-overlay";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { HEALTH_META, ZONES } from "@/lib/farm";
import type { ConnectionStatus, PlantState, SensorNode, WeatherCondition, ZoneId } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---------------------------- Sensor node ---------------------------- */

export function SensorNodeModel({
  node,
  status,
  selected,
  onClick,
}: {
  node: SensorNode;
  status: ConnectionStatus;
  selected?: boolean;
  onClick?: () => void;
}) {
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const color = status === "error" ? "#ef4444" : status === "connecting" ? "#eab308" : "#34d399";
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (led.current) led.current.emissiveIntensity = 1.4 + Math.sin(t * 4 + node.position[0]) * 1.1;
    if (ring.current) {
      const s = 1 + ((t * 0.6) % 1) * 2.2;
      ring.current.scale.setScalar(s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ((t * 0.6) % 1));
    }
  });
  return (
    <group
      position={node.position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => onClick && (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.9, 8]} />
        <meshStandardMaterial color="#cfd6d1" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.2, 0.14, 0.12]} />
        <meshStandardMaterial color="#f2efe6" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.95, 0.062]}>
        <planeGeometry args={[0.15, 0.08]} />
        <meshStandardMaterial color="#0d1f16" roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh position={[0.05, 0.97, 0.064]}>
        <sphereGeometry args={[0.012, 10, 8]} />
        <meshStandardMaterial ref={led} color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* tiny solar panel */}
      <mesh position={[0, 1.07, -0.02]} rotation-x={-0.6} castShadow>
        <boxGeometry args={[0.22, 0.01, 0.14]} />
        <meshStandardMaterial color="#1a2b4a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* antenna */}
      <mesh position={[0.08, 1.15, 0.03]}>
        <cylinderGeometry args={[0.004, 0.004, 0.25, 4]} />
        <meshStandardMaterial color="#1c1f1d" />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.16, 0.19, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.26, 0.31, 40]} />
          <meshBasicMaterial color="#e6cc85" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* --------------------------- Weather station --------------------------- */

export function WeatherStation({ condition, position }: { condition: WeatherCondition; position: [number, number, number] }) {
  const cups = useRef<THREE.Group>(null);
  const vane = useRef<THREE.Group>(null);
  const speed = condition === "rainy" ? 9 : condition === "cloudy" ? 5 : 2.6;
  useFrame(({ clock }, dt) => {
    if (cups.current) cups.current.rotation.y += dt * speed;
    if (vane.current) vane.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.5 + (condition === "rainy" ? 1.2 : 0.3);
  });
  return (
    <group position={position}>
      {/* concrete pad */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.08, 24]} />
        <meshStandardMaterial color="#b8b3a6" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 2.4, 10]} />
        <meshStandardMaterial color="#d9ddd8" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Stevenson screen */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0.26, 1.0 + i * 0.07, 0]} castShadow>
          <cylinderGeometry args={[0.16 - i * 0.01, 0.17 - i * 0.01, 0.045, 20]} />
          <meshStandardMaterial color="#f7f5ee" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0.13, 1.1, 0]}>
        <boxGeometry args={[0.18, 0.03, 0.03]} />
        <meshStandardMaterial color="#d9ddd8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* solar panel */}
      <mesh position={[-0.28, 1.65, 0]} rotation-z={0.6} castShadow>
        <boxGeometry args={[0.5, 0.02, 0.36]} />
        <meshStandardMaterial color="#14284a" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* control box */}
      <mesh position={[0, 0.7, 0.08]} castShadow>
        <boxGeometry args={[0.24, 0.3, 0.12]} />
        <meshStandardMaterial color="#e9e4d6" roughness={0.5} />
      </mesh>
      <mesh position={[0.06, 0.78, 0.142]}>
        <sphereGeometry args={[0.014, 10, 8]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      {/* rain gauge */}
      <mesh position={[0.45, 0.25, 0.3]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.42, 16]} />
        <meshStandardMaterial color="#c9ccc6" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* anemometer */}
      <group ref={cups} position={[0, 2.48, 0]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <group key={i} rotation-y={a}>
              <mesh position={[0.15, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.006, 0.006, 0.3, 4]} />
                <meshStandardMaterial color="#c8ccc6" metalness={0.7} />
              </mesh>
              <mesh position={[0.3, 0, 0]} rotation-x={Math.PI / 2}>
                <sphereGeometry args={[0.045, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#1c1f1d" side={THREE.DoubleSide} />
              </mesh>
            </group>
          );
        })}
      </group>
      {/* wind vane */}
      <group ref={vane} position={[0, 2.3, 0]}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.008, 0.008, 0.5, 4]} />
          <meshStandardMaterial color="#c9a54c" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.24, 0, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.006]} />
          <meshStandardMaterial color="#c9a54c" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------------------- Health rings ---------------------------- */

export function HealthRings({
  plants,
  visible,
  selectedId,
  hoveredId,
  selectedZone,
}: {
  plants: PlantState[];
  visible: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  selectedZone: ZoneId | "all";
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.RingGeometry(0.23, 0.3, 32).rotateX(-Math.PI / 2), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new THREE.Color();
    const mx = new THREE.Matrix4();
    plants.forEach((p, i) => {
      const dim = selectedZone !== "all" && p.zone !== selectedZone;
      c.set(HEALTH_META[p.health].color);
      if (dim) c.multiplyScalar(0.25);
      m.setColorAt(i, c);
      const s = p.id === hoveredId ? 1.25 : 1;
      mx.compose(new THREE.Vector3(p.position[0], p.position[1] + 0.035, p.position[2]), new THREE.Quaternion(), new THREE.Vector3(s, 1, s));
      m.setMatrixAt(i, mx);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [plants, hoveredId, selectedZone]);

  const sel = plants.find((p) => p.id === selectedId);
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const k = (clock.elapsedTime * 0.8) % 1;
    pulse.current.scale.setScalar(1 + k * 1.4);
    (pulse.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
  });

  return (
    <>
      <instancedMesh ref={ref} args={[geo, mat, plants.length]} visible={visible} />
      {sel && (
        <group position={[sel.position[0], sel.position[1] + 0.04, sel.position[2]]}>
          <mesh geometry={geo} scale={[1.45, 1, 1.45]}>
            <meshBasicMaterial color="#e6cc85" toneMapped={false} transparent opacity={0.95} depthWrite={false} />
          </mesh>
          <mesh ref={pulse} geometry={geo}>
            <meshBasicMaterial color="#e6cc85" toneMapped={false} transparent depthWrite={false} />
          </mesh>
        </group>
      )}
    </>
  );
}

/* ----------------------------- Zone frames ----------------------------- */

export function ZoneFrames({ selectedZone }: { selectedZone: ZoneId | "all" }) {
  return (
    <>
      {ZONES.map((z) => {
        const active = selectedZone === z.id;
        return (
          <mesh key={z.id} rotation-x={-Math.PI / 2} position={[z.center[0], 0.012, z.center[1]]} visible={active}>
            <planeGeometry args={[7.6, 3.2]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.12} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

/* ------------------------------- Hotspot ------------------------------- */

export function Hotspot({
  position,
  label,
  active,
  tone = "emerald",
  onClick,
  children,
}: {
  position: [number, number, number];
  label: string;
  active?: boolean;
  tone?: "emerald" | "gold" | "yellow" | "red";
  onClick: () => void;
  children?: ReactNode;
}) {
  const toneCls = {
    emerald: "bg-emerald-400",
    gold: "bg-gold-400",
    yellow: "bg-yellow-400",
    red: "bg-red-500",
  }[tone];
  return (
    <HotspotOverlay position={position}>
      <div className="relative hidden md:block" style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          aria-label={label}
          aria-expanded={active}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="group relative grid h-8 w-8 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className={cn("absolute inset-1 rounded-full opacity-60 animate-pulse-ring", toneCls)} />
          <span className={cn("relative h-3.5 w-3.5 rounded-full ring-2 ring-white/90 shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-transform group-hover:scale-125", toneCls)} />
          <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
            {label}
          </span>
        </button>
        {active && children}
      </div>
    </HotspotOverlay>
  );
}
