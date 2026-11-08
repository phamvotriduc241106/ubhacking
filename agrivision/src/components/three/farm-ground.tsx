"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BEDS_PER_ZONE, ZONES } from "@/lib/farm";
import type { WeatherCondition } from "@/lib/types";
import { mulberry32 } from "@/lib/utils";
import { createNoiseTexture } from "./geometries";
import type { PlantInput } from "./plant-field";

const BED_LEN = 6.6;
const BED_W = 0.78;
const BED_H = 0.2;

export function bedCenters() {
  const out: { x: number; z: number; zone: string }[] = [];
  for (const z of ZONES) for (let b = 0; b < BEDS_PER_ZONE; b++) out.push({ x: z.center[0], z: z.center[1] + (b === 0 ? -0.9 : 0.9), zone: z.id });
  return out;
}

function useInstances(ref: React.RefObject<THREE.InstancedMesh>, mats: THREE.Matrix4[], deps: unknown[]) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    mats.forEach((mat, i) => m.setMatrixAt(i, mat));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const M = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));

/* ------------------------------ Grass ------------------------------ */

function Grass({ count, wind }: { count: number; wind: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uWind: { value: wind } }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.035, 0.32, 3, 1);
    g.translate(0, 0.16, 0);
    return g;
  }, []);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uWind = uniforms.uWind;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWind;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float h = position.y / 0.32;
           vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
           transformed.x += sin(uTime * 2.1 + wp.x * 0.7 + wp.z * 0.4) * uWind * 4.0 * h * h;
           transformed.z += cos(uTime * 1.7 + wp.z * 0.6) * uWind * 2.0 * h * h;`,
        );
    };
    return m;
  }, [uniforms]);

  const mats = useMemo(() => {
    const r = mulberry32(3);
    const out: THREE.Matrix4[] = [];
    while (out.length < count) {
      const x = (r() - 0.5) * 34;
      const z = (r() - 0.5) * 30;
      const inFarm = Math.abs(x) < 8 && Math.abs(z) < 6.8;
      if (inFarm) continue;
      const s = 0.6 + r() * 0.9;
      out.push(M(x, 0, z, s, s * (0.8 + r() * 0.8), s, r() * 6));
    }
    return out;
  }, [count]);
  useInstances(ref, mats, [mats]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = mulberry32(5);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) m.setColorAt(i, c.set("#4f8f3a").offsetHSL((r() - 0.5) * 0.05, 0, (r() - 0.5) * 0.12));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uWind.value = THREE.MathUtils.lerp(uniforms.uWind.value, wind, 0.02);
  });

  return <instancedMesh ref={ref} args={[geo, mat, count]} receiveShadow />;
}

/* ------------------------------ Trees ------------------------------ */

function Trees({ count }: { count: number }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const { tm, cm } = useMemo(() => {
    const r = mulberry32(21);
    const tm: THREE.Matrix4[] = [];
    const cm: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const d = 17 + r() * 14;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const s = 0.8 + r() * 0.9;
      tm.push(M(x, 0.8 * s, z, s, s, s));
      cm.push(M(x, 1.9 * s, z, s * 1.3, s * 1.6, s * 1.3, r() * 6));
    }
    return { tm, cm };
  }, [count]);
  useInstances(trunks, tm, [tm]);
  useInstances(crowns, cm, [cm]);
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 1.6, 6]} />
        <meshStandardMaterial color="#5b4330" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, count]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#2f6a35" roughness={0.95} flatShading />
      </instancedMesh>
    </>
  );
}

/* --------------------------- Irrigation --------------------------- */

function Droplets({ plants, active }: { plants: PlantInput[]; active: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const level = useRef(active ? 1 : 0);
  const offsets = useMemo(() => plants.map((p) => (p.seed % 997) / 997), [plants]);
  useFrame(({ clock }, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    level.current = THREE.MathUtils.damp(level.current, active ? 1 : 0, 2, dt);
    const t = clock.elapsedTime;
    plants.forEach((p, i) => {
      const phase = (t * 0.9 + offsets[i]) % 1;
      const s = 0.022 * level.current * (1 - phase * 0.6);
      m.compose(
        new THREE.Vector3(p.position[0] + 0.16, 0.24 - phase * 0.1, p.position[2] + 0.18),
        new THREE.Quaternion(),
        new THREE.Vector3(s, s * 1.4, s),
      );
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, plants.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#8fd3f4" emissive="#2a8fbf" emissiveIntensity={0.6} transparent opacity={0.85} roughness={0.1} />
    </instancedMesh>
  );
}

/* ------------------------------ Ground ------------------------------ */

interface GroundProps {
  plants: PlantInput[];
  condition: WeatherCondition;
  quality: "high" | "lite";
  wind: number;
}

export function FarmGround({ plants, condition, quality, wind }: GroundProps) {
  const high = quality === "high";
  const tex = useMemo(() => {
    const grass = createNoiseTexture([74, 120, 52], 34, 256, 0.08, 1);
    grass.repeat.set(14, 14);
    const soil = createNoiseTexture([78, 56, 38], 40, 128, 0.12, 2);
    soil.repeat.set(5, 0.7);
    const gravel = createNoiseTexture([196, 184, 152], 46, 128, 0.2, 3);
    gravel.repeat.set(10, 0.8);
    return { grass, soil, gravel };
  }, []);

  const wet = condition === "rainy";
  const soilMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.soil, roughness: 0.95 }), [tex]);
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.grass, roughness: 1 }), [tex]);
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 1.2);
    soilMat.roughness = THREE.MathUtils.lerp(soilMat.roughness, wet ? 0.45 : 0.95, k);
    soilMat.color.lerp(new THREE.Color(wet ? "#9a8e86" : "#ffffff"), k);
    groundMat.roughness = THREE.MathUtils.lerp(groundMat.roughness, wet ? 0.7 : 1, k);
  });

  const beds = useMemo(bedCenters, []);
  const bedRef = useRef<THREE.InstancedMesh>(null);
  const edgeRef = useRef<THREE.InstancedMesh>(null);
  const dripRef = useRef<THREE.InstancedMesh>(null);
  const emitterRef = useRef<THREE.InstancedMesh>(null);
  const stakeRef = useRef<THREE.InstancedMesh>(null);

  const bedMats = useMemo(() => beds.map((b) => M(b.x, BED_H / 2, b.z, BED_LEN, BED_H, BED_W)), [beds]);
  const edgeMats = useMemo(
    () =>
      beds.flatMap((b) => [
        M(b.x, BED_H / 2 + 0.01, b.z - BED_W / 2 - 0.03, BED_LEN + 0.12, BED_H + 0.04, 0.06),
        M(b.x, BED_H / 2 + 0.01, b.z + BED_W / 2 + 0.03, BED_LEN + 0.12, BED_H + 0.04, 0.06),
        M(b.x - BED_LEN / 2 - 0.03, BED_H / 2 + 0.01, b.z, 0.06, BED_H + 0.04, BED_W + 0.12),
        M(b.x + BED_LEN / 2 + 0.03, BED_H / 2 + 0.01, b.z, 0.06, BED_H + 0.04, BED_W + 0.12),
      ]),
    [beds],
  );
  const dripMats = useMemo(
    () => beds.map((b) => new THREE.Matrix4().compose(new THREE.Vector3(b.x, BED_H + 0.02, b.z + 0.18), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, BED_LEN, 1))),
    [beds],
  );
  const emitterMats = useMemo(() => plants.map((p) => M(p.position[0] + 0.16, BED_H + 0.035, p.position[2] + 0.18, 1, 1, 1)), [plants]);
  const staked = useMemo(() => plants.filter((p) => p.growth > 0.9), [plants]);
  const stakeMats = useMemo(
    () =>
      staked.map((p) => {
        const h = 0.25 + 1.55 * Math.pow(p.growth / 5, 0.85);
        return M(p.position[0] - 0.09, BED_H + h / 2 - 0.05, p.position[2] - 0.07, 1, h, 1);
      }),
    [staked],
  );

  useInstances(bedRef, bedMats, [bedMats]);
  useInstances(edgeRef, edgeMats, [edgeMats]);
  useInstances(dripRef, dripMats, [dripMats]);
  useInstances(emitterRef, emitterMats, [emitterMats]);
  useInstances(stakeRef, stakeMats, [stakeMats]);

  return (
    <group>
      {/* meadow */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow material={groundMat}>
        <circleGeometry args={[60, 48]} />
      </mesh>
      {/* gravel paths */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]} receiveShadow>
        <planeGeometry args={[19, 1.5]} />
        <meshStandardMaterial map={tex.gravel} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2} position={[0, 0.007, 0]} receiveShadow>
        <planeGeometry args={[15, 1.5]} />
        <meshStandardMaterial map={tex.gravel} roughness={1} />
      </mesh>
      {/* raised beds */}
      <instancedMesh ref={bedRef} args={[undefined, soilMat, beds.length]} receiveShadow castShadow={high}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={edgeRef} args={[undefined, undefined, edgeMats.length]} castShadow={high} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#8a6a45" roughness={0.9} />
      </instancedMesh>
      {/* drip lines + emitters */}
      <instancedMesh ref={dripRef} args={[undefined, undefined, dripMats.length]}>
        <cylinderGeometry args={[0.018, 0.018, 1, 6]} />
        <meshStandardMaterial color="#1b211e" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={emitterRef} args={[undefined, undefined, plants.length]}>
        <cylinderGeometry args={[0.025, 0.025, 0.04, 6]} />
        <meshStandardMaterial color="#10b981" emissive="#065f46" emissiveIntensity={0.5} />
      </instancedMesh>
      {ZONES.map((z) => (
        <group key={z.id} position={[z.center[0] - BED_LEN / 2 - 0.35, 0, z.center[1]]}>
          <mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.035, 0.035, 2.1, 8]} />
            <meshStandardMaterial color="#2f3a35" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.3, 8]} />
            <meshStandardMaterial color="#2f3a35" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 12]} />
            <meshStandardMaterial color="#c9a54c" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <Droplets plants={plants} active={condition === "sunny"} />
      {/* bamboo stakes */}
      {stakeMats.length > 0 && (
        <instancedMesh key={stakeMats.length} ref={stakeRef} args={[undefined, undefined, stakeMats.length]} castShadow={high}>
          <cylinderGeometry args={[0.012, 0.014, 1, 5]} />
          <meshStandardMaterial color="#b89c6a" roughness={0.8} />
        </instancedMesh>
      )}
      {high && <Grass count={2600} wind={wind} />}
      <Trees count={high ? 34 : 16} />
    </group>
  );
}
