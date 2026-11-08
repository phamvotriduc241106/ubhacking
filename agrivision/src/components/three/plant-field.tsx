"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { HealthStatus } from "@/lib/types";
import { createCompoundLeafGeometry, createFruitGeometry, createStarGeometry, createStemGeometry } from "./geometries";
import { buildPlantSpec, type PlantElement } from "./plant-spec";

export interface PlantInput {
  id: string;
  position: [number, number, number];
  growth: number;
  seed: number;
  health: HealthStatus;
}

interface FlatElement {
  local: THREE.Matrix4;
  hf: number;
  plant: number;
  color?: THREE.Color;
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

const tmpM = new THREE.Matrix4();
const tmpR = new THREE.Matrix4();
const tmpT = new THREE.Matrix4();
const tmpE = new THREE.Euler();

function flatten(specs: ReturnType<typeof buildPlantSpec>[], key: "stems" | "leaves" | "fruits" | "calyxes" | "flowers") {
  const out: FlatElement[] = [];
  specs.forEach((s, plant) => s[key].forEach((e: PlantElement) => out.push({ local: e.matrix, hf: e.hf, plant, color: e.color })));
  return out;
}

export function PlantField({ plants, detail = 1, wind = 0.04, shadows = true, onSelect, onHover }: Props) {
  const geo = useMemo(
    () => ({
      leaf: createCompoundLeafGeometry(),
      stem: createStemGeometry(),
      fruit: createFruitGeometry(),
      star: createStarGeometry(5, 1, 0.38),
      flower: createStarGeometry(5, 1, 0.45),
      hit: new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0),
    }),
    [],
  );
  const mat = useMemo(
    () => ({
      leaf: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.72, side: THREE.DoubleSide }),
      stem: new THREE.MeshStandardMaterial({ color: "#4d7c36", roughness: 0.85 }),
      fruit: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
      calyx: new THREE.MeshStandardMaterial({ color: "#3f7a2e", roughness: 0.8, side: THREE.DoubleSide }),
      flower: new THREE.MeshStandardMaterial({ color: "#ffd83a", emissive: "#a67c00", emissiveIntensity: 0.55, roughness: 0.55, side: THREE.DoubleSide }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    }),
    [],
  );

  const specs = useMemo(
    () => plants.map((p) => buildPlantSpec(p.growth, p.seed, p.health, detail)),
    [plants, detail],
  );
  const groups = useMemo(
    () => ({
      stems: flatten(specs, "stems"),
      leaves: flatten(specs, "leaves"),
      fruits: flatten(specs, "fruits"),
      calyxes: flatten(specs, "calyxes"),
      flowers: flatten(specs, "flowers"),
    }),
    [specs],
  );

  const refs = {
    stems: useRef<THREE.InstancedMesh>(null),
    leaves: useRef<THREE.InstancedMesh>(null),
    fruits: useRef<THREE.InstancedMesh>(null),
    calyxes: useRef<THREE.InstancedMesh>(null),
    flowers: useRef<THREE.InstancedMesh>(null),
  };
  const hitRef = useRef<THREE.InstancedMesh>(null);
  const phases = useMemo(() => plants.map((p) => (p.seed % 1000) / 159), [plants]);

  const writeMatrices = (time: number) => {
    const sway = plants.map((p, i) => [
      Math.sin(time * 1.35 + phases[i] + p.position[0] * 0.4) * wind,
      Math.cos(time * 1.05 + phases[i] * 1.3 + p.position[2] * 0.3) * wind * 0.6,
    ]);
    (Object.keys(refs) as (keyof typeof refs)[]).forEach((k) => {
      const mesh = refs[k].current;
      if (!mesh) return;
      const list = groups[k];
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const p = plants[e.plant].position;
        const [ax, az] = sway[e.plant];
        const bend = e.hf * e.hf;
        tmpE.set(ax * bend, 0, az * bend);
        tmpR.makeRotationFromEuler(tmpE);
        tmpT.makeTranslation(p[0], p[1], p[2]);
        tmpM.multiplyMatrices(tmpT, tmpR).multiply(e.local);
        mesh.setMatrixAt(i, tmpM);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  useLayoutEffect(() => {
    (Object.keys(refs) as (keyof typeof refs)[]).forEach((k) => {
      const mesh = refs[k].current;
      if (!mesh) return;
      groups[k].forEach((e, i) => {
        if (e.color) mesh.setColorAt(i, e.color);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    const hit = hitRef.current;
    if (hit) {
      plants.forEach((p, i) => {
        const h = specs[i].height + 0.15;
        hit.setMatrixAt(i, tmpM.compose(new THREE.Vector3(...p.position), new THREE.Quaternion(), new THREE.Vector3(0.34, h, 0.34)));
      });
      hit.instanceMatrix.needsUpdate = true;
      hit.computeBoundingSphere();
    }
    writeMatrices(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, plants, specs]);

  const frame = useRef(0);
  useFrame(({ clock }) => {
    if (wind <= 0) return;
    frame.current++;
    // Lite mode renders fewer leaves; also update every other frame there to save CPU.
    if (detail < 1 && frame.current % 2) return;
    writeMatrices(clock.elapsedTime);
  });

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId != null ? plants[e.instanceId]?.id : undefined);

  return (
    <group>
      <instancedMesh key={`s${groups.stems.length}`} ref={refs.stems} args={[geo.stem, mat.stem, groups.stems.length]} castShadow={shadows} frustumCulled={false} />
      <instancedMesh key={`l${groups.leaves.length}`} ref={refs.leaves} args={[geo.leaf, mat.leaf, groups.leaves.length]} castShadow={shadows} receiveShadow={shadows} frustumCulled={false} />
      {groups.fruits.length > 0 && (
        <instancedMesh key={`f${groups.fruits.length}`} ref={refs.fruits} args={[geo.fruit, mat.fruit, groups.fruits.length]} castShadow={shadows} frustumCulled={false} />
      )}
      {groups.calyxes.length > 0 && (
        <instancedMesh key={`c${groups.calyxes.length}`} ref={refs.calyxes} args={[geo.star, mat.calyx, groups.calyxes.length]} frustumCulled={false} />
      )}
      {groups.flowers.length > 0 && (
        <instancedMesh key={`w${groups.flowers.length}`} ref={refs.flowers} args={[geo.flower, mat.flower, groups.flowers.length]} frustumCulled={false} />
      )}
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
