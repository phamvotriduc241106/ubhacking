import * as THREE from "three";

/**
 * GPU wind sway for instanced plant parts.
 *
 * Each instance carries two per-instance attributes:
 *   aBase – the plant's base position (the pivot of the sway), world space
 *   aSway – (phaseX, phaseZ, heightFraction)
 *
 * The vertex shader bends the already-instanced vertex around aBase, so instance
 * matrices are written once and never re-uploaded per frame. The math matches the
 * previous CPU path: R = Rx(ax·h²) · Rz(az·h²) applied about the plant base.
 */
export interface WindUniforms {
  uTime: THREE.IUniform<number>;
  uWind: THREE.IUniform<number>;
}

export function createWindUniforms(wind = 0): WindUniforms {
  return { uTime: { value: 0 }, uWind: { value: wind } };
}

const HEADER = /* glsl */ `
attribute vec3 aBase;
attribute vec3 aSway;
uniform float uTime;
uniform float uWind;
vec3 windSway(vec3 p) {
  float bend = aSway.z * aSway.z;
  float ax = sin(uTime * 1.35 + aSway.x) * uWind * bend;
  float az = cos(uTime * 1.05 + aSway.y) * uWind * 0.6 * bend;
  vec3 r = p - aBase;
  float cz = cos(az), sz = sin(az);
  r = vec3(cz * r.x - sz * r.y, sz * r.x + cz * r.y, r.z);
  float cx = cos(ax), sx = sin(ax);
  r = vec3(r.x, cx * r.y - sx * r.z, sx * r.y + cx * r.z);
  return aBase + r;
}
`;

function patch(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: WindUniforms) {
  shader.uniforms.uTime = uniforms.uTime;
  shader.uniforms.uWind = uniforms.uWind;
  const project = THREE.ShaderChunk.project_vertex.replace(
    "mvPosition = instanceMatrix * mvPosition;",
    "mvPosition = instanceMatrix * mvPosition;\n\tmvPosition.xyz = windSway( mvPosition.xyz );",
  );
  const worldpos = THREE.ShaderChunk.worldpos_vertex.replace(
    "worldPosition = instanceMatrix * worldPosition;",
    "worldPosition = instanceMatrix * worldPosition;\n\t\tworldPosition.xyz = windSway( worldPosition.xyz );",
  );
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\n${HEADER}`)
    .replace("#include <project_vertex>", project)
    .replace("#include <worldpos_vertex>", worldpos);
}

/** Patches a material in place so its instances sway with the wind. */
export function withWind<T extends THREE.Material>(material: T, uniforms: WindUniforms): T {
  material.onBeforeCompile = (shader) => patch(shader, uniforms);
  material.customProgramCacheKey = () => "plant-wind-v1";
  return material;
}

/** Depth material for shadow casting that sways identically to the visible mesh. */
export function createWindDepthMaterial(uniforms: WindUniforms, side: THREE.Side = THREE.FrontSide) {
  return withWind(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side }), uniforms);
}
