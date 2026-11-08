import * as THREE from "three";
import type { HealthStatus } from "@/lib/types";
import { clamp, mulberry32 } from "@/lib/utils";

export interface PlantElement {
  matrix: THREE.Matrix4;
  /** 0 at the soil, 1 at the top. Drives how much wind sway the element gets. */
  hf: number;
  color?: THREE.Color;
}

export interface PlantSpec {
  height: number;
  stems: PlantElement[];
  leaves: PlantElement[];
  fruits: PlantElement[];
  calyxes: PlantElement[];
  flowers: PlantElement[];
}

const UP = new THREE.Vector3(0, 1, 0);
const GREEN_FRUIT = new THREE.Color("#5f9a3a");
const TURNING = new THREE.Color("#e3a33b");
const RED = new THREE.Color("#d4372a");
const OVERRIPE = new THREE.Color("#7f1f14");

export function fruitColor(level: number, out = new THREE.Color()) {
  if (level < 0.5) return out.copy(GREEN_FRUIT).lerp(TURNING, level / 0.5);
  if (level < 0.9) return out.copy(TURNING).lerp(RED, (level - 0.5) / 0.4);
  return out.copy(RED).lerp(OVERRIPE, clamp((level - 0.9) / 0.3, 0, 1));
}

const LEAF_HEALTHY = [new THREE.Color("#2f7a34"), new THREE.Color("#3d8b3a"), new THREE.Color("#28692f")];
const LEAF_ATTENTION = new THREE.Color("#a7a23a");
const LEAF_STRESS = new THREE.Color("#8a6a2c");

/**
 * Procedural tomato plant for a growth value g ∈ [0, 5]:
 * 0 seedling · 1 vegetative · 2 flowering · 3 fruit development · 4 ripening · 5 harvest
 */
export function buildPlantSpec(g: number, seed: number, health: HealthStatus = "healthy", detail = 1): PlantSpec {
  const rand = mulberry32(seed);
  const t = clamp(g / 5, 0, 1);
  const height = 0.1 + 1.55 * Math.pow(t, 0.85);
  const stemR = 0.008 + 0.028 * Math.pow(t, 0.7);

  const stems: PlantElement[] = [];
  const leaves: PlantElement[] = [];
  const fruits: PlantElement[] = [];
  const calyxes: PlantElement[] = [];
  const flowers: PlantElement[] = [];

  // Main stem as a gently zig-zagging polyline
  const N = 7;
  const pts: THREE.Vector3[] = [];
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const wob = 0.025 * Math.min(1, g) * Math.sin(i * 1.9 + phase);
    pts.push(new THREE.Vector3(wob, f * height, 0.6 * wob * Math.cos(i * 1.3 + phase)));
  }
  const stemAt = (f: number) => {
    const x = f * N;
    const i = Math.min(N - 1, Math.floor(x));
    return pts[i].clone().lerp(pts[i + 1], x - i);
  };

  const q = new THREE.Quaternion();
  const pushSegment = (a: THREE.Vector3, b: THREE.Vector3, r: number, hf: number) => {
    const dir = b.clone().sub(a);
    const len = dir.length();
    q.setFromUnitVectors(UP, dir.normalize());
    stems.push({ matrix: new THREE.Matrix4().compose(a, q.clone(), new THREE.Vector3(r, len, r)), hf });
  };
  for (let i = 0; i < N; i++) pushSegment(pts[i], pts[i + 1], stemR * (1 - (i / N) * 0.55), i / N);

  const leafBase =
    health === "stress" ? LEAF_STRESS : health === "attention" ? LEAF_ATTENTION : null;

  // Cotyledons on young seedlings
  if (g < 0.9) {
    for (const yaw of [0, Math.PI]) {
      const m = new THREE.Matrix4().compose(
        pts[N].clone(),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + phase, 0.35)),
        new THREE.Vector3(0.14, 0.14, 0.24),
      );
      leaves.push({ matrix: m, hf: 1, color: LEAF_HEALTHY[1].clone().offsetHSL(0.02, 0, 0.06) });
    }
  }

  // True leaves, spiralling up the stem at the golden angle
  const leafCount = Math.max(2, Math.round((2 + Math.min(g, 3.4) * 4.2) * detail));
  const leafScaleBase = 0.22 + 0.68 * clamp(g / 2.4, 0, 1);
  for (let i = 0; i < leafCount; i++) {
    const f = 0.2 + (i / Math.max(1, leafCount - 1)) * 0.76;
    if (g < 0.9 && f > 0.85) continue;
    const yaw = i * 2.39996 + phase;
    const pitch = f > 0.82 ? 0.55 : f > 0.6 ? 0.22 : 0.02 - rand() * 0.08;
    const s = leafScaleBase * (1.05 - f * 0.45) * (0.85 + rand() * 0.3);
    const m = new THREE.Matrix4().compose(
      stemAt(f),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 0.3 - 0.15, yaw, pitch, "YZX")),
      new THREE.Vector3(s, s, s * (0.9 + rand() * 0.2)),
    );
    const c = LEAF_HEALTHY[i % 3].clone().offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * 0.05);
    // Older bottom leaves yellow slightly late in the season, and unhealthy plants tint
    if (g > 4.2 && f < 0.3) c.lerp(LEAF_ATTENTION, 0.35);
    if (leafBase) c.lerp(leafBase, f < 0.5 ? 0.6 : 0.3);
    leaves.push({ matrix: m, hf: f, color: c });
  }

  // Flower trusses (fade out as fruit takes over)
  const flowerAmount = g < 1.55 ? 0 : g < 1.95 ? (g - 1.55) / 0.4 : g < 3.5 ? 1 - (g - 1.95) / 1.55 : 0;
  const trussCount = g >= 1.55 ? Math.min(4, 1 + Math.floor((g - 1.55) * 1.5)) : 0;
  const trusses = Array.from({ length: trussCount }, (_, k) => ({
    f: 0.38 + k * 0.14,
    yaw: k * 2.1 + phase + 0.8,
  }));

  trusses.forEach((tr, k) => {
    const attach = stemAt(tr.f);
    const dir = new THREE.Vector3(Math.cos(tr.yaw), 0, -Math.sin(tr.yaw));
    const center = attach.clone().addScaledVector(dir, 0.13).add(new THREE.Vector3(0, -0.05, 0));
    pushSegment(attach, center, stemR * 0.35, tr.f);

    const nFlowers = Math.round(5 * flowerAmount * (k === trussCount - 1 ? 1 : 0.6));
    for (let i = 0; i < nFlowers; i++) {
      const a = (i / Math.max(1, nFlowers)) * Math.PI * 2 + rand();
      const p = center.clone().add(new THREE.Vector3(Math.cos(a) * 0.04, -0.02 - rand() * 0.03, Math.sin(a) * 0.04));
      flowers.push({
        matrix: new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35 + rand() * 0.3, a, 0.35)), new THREE.Vector3(0.05, 0.05, 0.05)),
        hf: tr.f,
      });
    }

    // Fruit on lower, older trusses first
    const fruitStart = 2.5 + k * 0.28;
    if (g > fruitStart) {
      const size = 0.018 + 0.06 * clamp((g - fruitStart) / 1.1, 0, 1);
      const ripeLevel = clamp((g - 3.4 - k * 0.12) / 1.1, 0, 1.15) + (k === 0 ? 0.06 : 0);
      const nFruit = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < nFruit; i++) {
        const a = (i / nFruit) * Math.PI * 2 + rand() * 0.6;
        const rr = size * 1.5;
        const p = center.clone().add(new THREE.Vector3(Math.cos(a) * rr, -size * (1 + (i % 2) * 0.7), Math.sin(a) * rr));
        const s = size * (0.85 + rand() * 0.3);
        const lvl = clamp(ripeLevel + (rand() - 0.5) * 0.18, 0, 1.25);
        fruits.push({
          matrix: new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(s, s, s)),
          hf: tr.f,
          color: fruitColor(lvl),
        });
        calyxes.push({
          matrix: new THREE.Matrix4().compose(
            p.clone().add(new THREE.Vector3(0, s * 0.8, 0)),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 3, 0)),
            new THREE.Vector3(s * 0.55, s * 0.55, s * 0.55),
          ),
          hf: tr.f,
        });
      }
    }
  });

  return { height, stems, leaves, fruits, calyxes, flowers };
}
