import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "@/lib/utils";

/** One serrated-ish tomato leaflet, tip pointing +Y, lying in the XY plane. */
function leafletShape(w: number, l: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w * 0.9, l * 0.12, w * 1.05, l * 0.55, w * 0.18, l * 0.92);
  s.lineTo(0, l);
  s.lineTo(-w * 0.18, l * 0.92);
  s.bezierCurveTo(-w * 1.05, l * 0.55, -w * 0.9, l * 0.12, 0, 0);
  return s;
}

/**
 * A compound tomato leaf: a rachis along +X with paired leaflets and a terminal leaflet.
 * Length ≈ 1 unit; instances are scaled per plant.
 */
export function createCompoundLeafGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const pairs = [
    { x: 0.16, size: 0.5, angle: 1.25 },
    { x: 0.27, size: 0.28, angle: 1.4 },
    { x: 0.38, size: 0.88, angle: 1.05 },
    { x: 0.49, size: 0.3, angle: 1.3 },
    { x: 0.6, size: 0.95, angle: 0.92 },
    { x: 0.78, size: 0.78, angle: 0.75 },
  ];
  for (const p of pairs) {
    for (const side of [-1, 1]) {
      const g = new THREE.ShapeGeometry(leafletShape(0.14 * p.size, 0.34 * p.size), 6);
      g.rotateX(-Math.PI / 2); // lie flat, tip toward -Z
      // Rotate so the tip points outward to its side and forward along the rachis (+X)
      g.rotateY(side < 0 ? p.angle - Math.PI / 2 : -Math.PI / 2 - p.angle);
      g.translate(p.x, 0, 0);
      parts.push(g);
    }
  }
  const terminal = new THREE.ShapeGeometry(leafletShape(0.15, 0.36), 6);
  terminal.rotateX(-Math.PI / 2);
  terminal.rotateY(-Math.PI / 2);
  terminal.translate(0.9, 0, 0);
  parts.push(terminal);

  const rachis = new THREE.BoxGeometry(1.02, 0.012, 0.012);
  rachis.translate(0.51, 0, 0);
  // Box has no matching groups issue; drop groups to merge cleanly
  rachis.clearGroups();
  parts.push(rachis);

  const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()), false)!;
  // Droop toward the tip and cup the leaflets slightly
  const pos = merged.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, pos.getY(i) - 0.22 * x * x + 0.35 * z * z);
  }
  merged.computeVertexNormals();
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Five-point star, used for tomato calyx (green) and flowers (yellow). */
export function createStarGeometry(points = 5, outer = 1, inner = 0.38) {
  const s = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  // Lift the petal tips a little so flowers read as cups
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i), pos.getZ(i));
    pos.setY(i, -0.25 * d * d);
  }
  g.computeVertexNormals();
  return g;
}

/** Tomato fruit: slightly flattened, gently ribbed sphere. */
export function createFruitGeometry() {
  const g = new THREE.SphereGeometry(1, 18, 14);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.z, v.x);
    const rib = 1 + 0.035 * Math.cos(a * 6) * (1 - Math.abs(v.y));
    pos.setXYZ(i, v.x * rib, v.y * 0.84, v.z * rib);
  }
  g.computeVertexNormals();
  return g;
}

/** Unit stem segment from y=0 to y=1. */
export function createStemGeometry() {
  const g = new THREE.CylinderGeometry(0.8, 1, 1, 7, 1, true);
  g.translate(0, 0.5, 0);
  return g;
}

/** Procedural noise texture for soil and grass, generated once in the browser. */
export function createNoiseTexture(
  base: [number, number, number],
  variance: number,
  size = 256,
  speckle = 0.06,
  seed = 7,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const rand = mulberry32(seed);
  for (let i = 0; i < size * size; i++) {
    const n = (rand() - 0.5) * variance;
    const sp = rand() < speckle ? (rand() - 0.3) * variance * 2.2 : 0;
    img.data[i * 4] = Math.max(0, Math.min(255, base[0] + n + sp));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + n * 0.9 + sp));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + n * 0.7 + sp));
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // soften
  ctx.globalAlpha = 0.5;
  ctx.filter = "blur(1px)";
  ctx.drawImage(canvas, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
