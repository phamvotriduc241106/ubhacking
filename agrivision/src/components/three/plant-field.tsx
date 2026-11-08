"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { HealthStatus } from "@/lib/types";
import { getPlantGeometries } from "./geometries";
import { buildPlantSpec, type PlantElement } from "./plant-spec";
import { createWindDepthMaterial, createWindUniforms, withWind } from "./wind";

export interface PlantInput {
  id: string;
  position: [number, number, number];
  growth: number;
  seed: number;
  health: HealthStatus;
}

interface Props {
  plants: PlantInput[];
  /** Fraction of leaves to render (lite mode uses fewer). */
  detail?: number;
  /** Sway amplitude in radians at the top of the plant. */
  wind?: number;
  shadows?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

type PartKey = "stems" | "leaves" | "fruits" | "calyxes" | "flowers";
const PARTS: PartKey[] = ["stems", "leaves", "fruits", "calyxes", "flowers"];

interface FlatPart {
  count: number;
  matrices: Float32Array;
  base: Float32Array;
  sway: Float32Array;
  colors: Float32Array | null;
}

/** Round instance capacity up so small count changes (growth slider) reuse the same buffers. */
const capacityFor = (n: number) => Math.max(32, Math.ceil(n / 64) * 64);

const tmpM = new THREE.Matrix4();
const tmpT = new THREE.Matrix4();

function flatten(specs: ReturnType<typeof buildPlantSpec>[], plants: PlantInput[], key: PartKey): FlatPart {
  let count = 0;
  for (const s of specs) count += s[key].length;
  const matrices = new Float32Array(count * 16);
  const base = new Float32Array(count * 3);
  const sway = new Float32Array(count * 3);
  let colors: Float32Array | null = null;
  let i = 0;
  specs.forEach((s, pi) => {
    const p = plants[pi].position;
    const phase = (plants[pi].seed % 1000) / 159;
    tmpT.makeTranslation(p[0], p[1], p[2]);
    s[key].forEach((e: PlantElement) => {
      tmpM.multiplyMatrices(tmpT, e.matrix).toArray(matrices, i * 16);
      base.set(p, i * 3);
      sway[i * 3] = phase + p[0] * 0.4;
      sway[i * 3 + 1] = phase * 1.3 + p[2] * 0.3;
      sway[i * 3 + 2] = e.hf;
      if (e.color) {
        colors ??= new Float32Array(count * 3).fill(1);
        e.color.toArray(colors, i * 3);
      }
      i++;
    });
  });
  return { count, matrices, base, sway, colors };
}

/** One instanced mesh for a plant part, with GPU wind and a reusable capacity. */
function PartMesh({
  part,
  geometry,
  material,
  depthMaterial,
  castShadow,
  receiveShadow,
}: {
  part: FlatPart;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  depthMaterial: THREE.Material;
  castShadow: boolean;
  receiveShadow?: boolean;
}) {
  const cap = capacityFor(part.count);
  // Per-mesh geometry clone carries the per-instance wind attributes.
  const geo = useMemo(() => {
    const g = geometry.clone();
    g.setAttribute("aBase", new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    g.setAttribute("aSway", new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    return g;
  }, [geometry, cap]);
  useEffect(() => () => geo.dispose(), [geo]);

  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.count = part.count;
    (mesh.instanceMatrix.array as Float32Array).set(part.matrices);
    mesh.instanceMatrix.clearUpdateRanges();
    mesh.instanceMatrix.addUpdateRange(0, part.count * 16);
    mesh.instanceMatrix.needsUpdate = true;
    const aBase = geo.getAttribute("aBase") as THREE.InstancedBufferAttribute;
    const aSway = geo.getAttribute("aSway") as THREE.InstancedBufferAttribute;
    (aBase.array as Float32Array).set(part.base);
    (aSway.array as Float32Array).set(part.sway);
    aBase.needsUpdate = true;
    aSway.needsUpdate = true;
    if (part.colors) {
      if (!mesh.instanceColor) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
      (mesh.instanceColor.array as Float32Array).set(part.colors);
      mesh.instanceColor.needsUpdate = true;
    }
  }, [part, geo, cap]);

  return (
    <instancedMesh
      key={cap}
      ref={ref}
      args={[geo, material, cap]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      customDepthMaterial={depthMaterial}
      frustumCulled={false}
    />
  );
}

function PlantFieldImpl({ plants, detail = 1, wind = 0.04, shadows = true, onSelect, onHover }: Props) {
  const geo = getPlantGeometries();
  const uniforms = useMemo(() => createWindUniforms(wind), []); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(
    () => ({
      leaf: withWind(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.72, side: THREE.DoubleSide }), uniforms),
      stem: withWind(new THREE.MeshStandardMaterial({ color: "#4d7c36", roughness: 0.85 }), uniforms),
      fruit: withWind(new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.25 }), uniforms),
      calyx: withWind(new THREE.MeshStandardMaterial({ color: "#3f7a2e", roughness: 0.8, side: THREE.DoubleSide }), uniforms),
      flower: withWind(new THREE.MeshStandardMaterial({ color: "#ffd83a", emissive: "#a67c00", emissiveIntensity: 0.55, roughness: 0.55, side: THREE.DoubleSide }), uniforms),
      depth: createWindDepthMaterial(uniforms),
      depthDouble: createWindDepthMaterial(uniforms, THREE.DoubleSide),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    }),
    [uniforms],
  );
  useEffect(() => () => Object.values(mat).forEach((m) => m.dispose()), [mat]);

  const specs = useMemo(() => plants.map((p) => buildPlantSpec(p.growth, p.seed, p.health, detail)), [plants, detail]);
  const parts = useMemo(() => Object.fromEntries(PARTS.map((k) => [k, flatten(specs, plants, k)])) as Record<PartKey, FlatPart>, [specs, plants]);

  const hitRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const hit = hitRef.current;
    if (!hit) return;
    const v = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    plants.forEach((p, i) => hit.setMatrixAt(i, tmpM.compose(v.set(...p.position), q, s.set(0.34, specs[i].height + 0.15, 0.34))));
    hit.instanceMatrix.needsUpdate = true;
    hit.computeBoundingSphere();
  }, [plants, specs]);

  // Only two uniform writes per frame; all sway math runs in the vertex shader.
  useFrame(({ clock }, dt) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uWind.value = THREE.MathUtils.damp(uniforms.uWind.value, wind, 2, dt);
  });

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId != null ? plants[e.instanceId]?.id : undefined);

  return (
    <group>
      <PartMesh part={parts.stems} geometry={geo.stem} material={mat.stem} depthMaterial={mat.depth} castShadow={shadows} />
      <PartMesh part={parts.leaves} geometry={geo.leaf} material={mat.leaf} depthMaterial={mat.depthDouble} castShadow={shadows} receiveShadow={shadows} />
      {parts.fruits.count > 0 && <PartMesh part={parts.fruits} geometry={geo.fruit} material={mat.fruit} depthMaterial={mat.depth} castShadow={shadows} />}
      {parts.calyxes.count > 0 && <PartMesh part={parts.calyxes} geometry={geo.star} material={mat.calyx} depthMaterial={mat.depthDouble} castShadow={false} />}
      {parts.flowers.count > 0 && <PartMesh part={parts.flowers} geometry={geo.flower} material={mat.flower} depthMaterial={mat.depthDouble} castShadow={false} />}
      {onSelect && (
        <instancedMesh
          key={`h${plants.length}`}
          ref={hitRef}
          args={[geo.hit, mat.hit, plants.length]}
          onClick={(e) => {
            e.stopPropagation();
            const id = pick(e);
            if (id) onSelect(id);
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            onHover?.(pick(e) ?? null);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover?.(null);
            document.body.style.cursor = "";
          }}
        />
      )}
    </group>
  );
}

/** Memoized so sensor ticks that re-render the scene do not touch the plants. */
export const PlantField = memo(PlantFieldImpl);
