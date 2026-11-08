"use client";

import { Environment, Lightformer, Sky, Sparkles } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { WeatherCondition } from "@/lib/types";
import { mulberry32 } from "@/lib/utils";

export type TimeOfDay = "day" | "dusk";

interface Look {
  bg: string;
  fogNear: number;
  fogFar: number;
  sun: number;
  sunColor: string;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  cloud: string;
  coverage: number;
  rain: number;
}

const LOOKS: Record<TimeOfDay, Record<WeatherCondition, Look>> = {
  day: {
    sunny: { bg: "#bfe0ea", fogNear: 26, fogFar: 80, sun: 2.7, sunColor: "#fff3dc", hemiSky: "#d9f0ff", hemiGround: "#3b5a2a", hemi: 0.75, cloud: "#ffffff", coverage: 0.35, rain: 0 },
    cloudy: { bg: "#aeb8b5", fogNear: 16, fogFar: 60, sun: 0.85, sunColor: "#e9eef0", hemiSky: "#d4dbdb", hemiGround: "#3a4a33", hemi: 1.05, cloud: "#d7dcdc", coverage: 0.85, rain: 0 },
    rainy: { bg: "#6a7673", fogNear: 9, fogFar: 42, sun: 0.3, sunColor: "#c9d3d6", hemiSky: "#9aa7a8", hemiGround: "#27332b", hemi: 0.85, cloud: "#7c8584", coverage: 1, rain: 1 },
  },
  dusk: {
    sunny: { bg: "#2a2a35", fogNear: 22, fogFar: 70, sun: 2.1, sunColor: "#ffb26b", hemiSky: "#ffcf9e", hemiGround: "#1c2a1d", hemi: 0.5, cloud: "#ffd6b0", coverage: 0.35, rain: 0 },
    cloudy: { bg: "#2c3533", fogNear: 14, fogFar: 52, sun: 0.6, sunColor: "#ffc89a", hemiSky: "#7d8787", hemiGround: "#18221a", hemi: 0.8, cloud: "#76807e", coverage: 0.85, rain: 0 },
    rainy: { bg: "#1c2423", fogNear: 8, fogFar: 36, sun: 0.22, sunColor: "#b7c2c4", hemiSky: "#5b6767", hemiGround: "#111a14", hemi: 0.7, cloud: "#4a5352", coverage: 1, rain: 1 },
  },
};

const tmpColor = new THREE.Color();

/* ------------------------------ Clouds ------------------------------ */

const CLOUDS = 16;
const PUFFS = 7;

/**
 * Clouds drift and fade entirely on the GPU. Each puff instance stores its offset from the
 * cloud center in the instance matrix; aCloud = (startX, y, z, speed), aOrder = cloud index.
 * Coverage (how many clouds are visible) is a uniform eased on the CPU — one write per frame.
 */
const CLOUD_HEADER = /* glsl */ `
attribute vec4 aCloud;
attribute float aOrder;
uniform float uTime;
uniform float uCoverage;
vec3 cloudPlace(vec3 local) {
  float vis = clamp(uCoverage * ${CLOUDS}.0 - aOrder, 0.0, 1.0);
  float x = mod(aCloud.x + uTime * aCloud.w + 30.0, 60.0) - 30.0;
  return vec3(x, aCloud.y, aCloud.z) + local * vis;
}
`;

function patchCloud(material: THREE.Material, uniforms: { uTime: THREE.IUniform<number>; uCoverage: THREE.IUniform<number> }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uCoverage = uniforms.uCoverage;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${CLOUD_HEADER}`)
      .replace(
        "#include <project_vertex>",
        THREE.ShaderChunk.project_vertex.replace("mvPosition = instanceMatrix * mvPosition;", "mvPosition = instanceMatrix * mvPosition;\n\tmvPosition.xyz = cloudPlace( mvPosition.xyz );"),
      )
      .replace(
        "#include <worldpos_vertex>",
        THREE.ShaderChunk.worldpos_vertex.replace("worldPosition = instanceMatrix * worldPosition;", "worldPosition = instanceMatrix * worldPosition;\n\t\tworldPosition.xyz = cloudPlace( worldPosition.xyz );"),
      );
  };
  material.customProgramCacheKey = () => "cloud-v1";
  return material;
}

function Clouds({ look, shadows }: { look: React.MutableRefObject<Look>; shadows: boolean }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uCoverage: { value: look.current.coverage } }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(
    () => patchCloud(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.94 }), uniforms) as THREE.MeshStandardMaterial,
    [uniforms],
  );
  const depthMat = useMemo(() => patchCloud(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uniforms), [uniforms]);
  const geo = useMemo(() => {
    const r = mulberry32(42);
    const g = new THREE.IcosahedronGeometry(1, 2);
    const aCloud = new Float32Array(CLOUDS * PUFFS * 4);
    const aOrder = new Float32Array(CLOUDS * PUFFS);
    const matrices: THREE.Matrix4[] = [];
    let i = 0;
    for (let c = 0; c < CLOUDS; c++) {
      const x = (r() - 0.5) * 60;
      const z = (r() - 0.5) * 34 - 4;
      const y = 10 + r() * 3;
      const speed = 0.35 + r() * 0.35;
      const size = 1.1 + r() * 1.1;
      for (let k = 0; k < PUFFS; k++) {
        const dx = (k - PUFFS / 2) * 0.9 + (r() - 0.5) * 0.6;
        const dy = (r() - 0.3) * 0.6;
        const dz = (r() - 0.5) * 1.4;
        const ps = (0.8 + r() * 0.9 - Math.abs(k - PUFFS / 2) * 0.12) * size;
        matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(dx * size, dy * size, dz * size), new THREE.Quaternion(), new THREE.Vector3(ps * 1.15, ps * 0.72, ps)));
        aCloud.set([x, y, z, speed], i * 4);
        aOrder[i] = c;
        i++;
      }
    }
    g.setAttribute("aCloud", new THREE.InstancedBufferAttribute(aCloud, 4));
    g.setAttribute("aOrder", new THREE.InstancedBufferAttribute(aOrder, 1));
    return { g, matrices };
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    geo.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [geo]);
  useEffect(() => () => {
    geo.g.dispose();
    mat.dispose();
    depthMat.dispose();
  }, [geo, mat, depthMat]);

  useFrame(({ clock }, dt) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uCoverage.value = THREE.MathUtils.damp(uniforms.uCoverage.value, look.current.coverage, 1.2, dt);
    mat.color.lerp(tmpColor.set(look.current.cloud), Math.min(1, dt * 1.5));
  });

  return <instancedMesh ref={ref} args={[geo.g, mat, CLOUDS * PUFFS]} castShadow={shadows} customDepthMaterial={depthMat} frustumCulled={false} />;
}

/* ------------------------------ Rain ------------------------------ */

/** Rain streaks fall in the vertex shader; the buffer is uploaded once and never touched again. */
function Rain({ look, count }: { look: React.MutableRefObject<Look>; count: number }) {
  const ref = useRef<THREE.LineSegments>(null);
  const amount = useRef(look.current.rain);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const geo = useMemo(() => {
    const r = mulberry32(9);
    const pos = new Float32Array(count * 6);
    const speed = new Float32Array(count * 2);
    const top = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 34;
      const y = r() * 14;
      const z = (r() - 0.5) * 34;
      pos.set([x, y, z, x, y, z], i * 6);
      const sp = 11 + r() * 6;
      speed[i * 2] = speed[i * 2 + 1] = sp;
      top[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.setAttribute("aTop", new THREE.BufferAttribute(top, 1));
    return g;
  }, [count]);
  const mat = useMemo(() => {
    const m = new THREE.LineBasicMaterial({ color: "#d6e2ea", transparent: true, opacity: 0, depthWrite: false });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aSpeed;\nattribute float aTop;\nuniform float uTime;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.y = mod(position.y - uTime * aSpeed, 14.0) + aTop * 0.35;\ntransformed.x += aTop * 0.03;",
        );
    };
    m.customProgramCacheKey = () => "rain-v1";
    return m;
  }, [uniforms]);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  useFrame(({ clock }, dt) => {
    amount.current = THREE.MathUtils.damp(amount.current, look.current.rain, 1.5, dt);
    mat.opacity = amount.current * 0.55;
    uniforms.uTime.value = clock.elapsedTime;
    if (ref.current) ref.current.visible = amount.current > 0.02;
  });

  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/* ------------------------- Shadow scheduling ------------------------- */

/**
 * The shadow pass re-renders every caster. Sun, clouds and sway move slowly, so refreshing
 * the shadow map every other frame is visually identical and saves a full depth pass per frame.
 */
function ShadowScheduler({ every = 2 }: { every?: number }) {
  const { gl } = useThree();
  const frame = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  useFrame(() => {
    if (frame.current++ % every === 0) gl.shadowMap.needsUpdate = true;
  });
  return null;
}

/* --------------------------- Environment --------------------------- */

interface EnvProps {
  condition: WeatherCondition;
  timeOfDay: TimeOfDay;
  quality: "high" | "lite";
  animateSun?: boolean;
}

function FarmEnvironmentImpl({ condition, timeOfDay, quality, animateSun = true }: EnvProps) {
  const { scene } = useThree();
  const target = LOOKS[timeOfDay][condition];
  const look = useRef<Look>(target);
  look.current = target;

  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sky = useRef<THREE.Mesh>(null);
  const high = quality === "high";

  useEffect(() => {
    scene.background = new THREE.Color(target.bg);
    scene.fog = new THREE.Fog(target.bg, target.fogNear, target.fogFar);
    return () => {
      scene.fog = null;
    };
    // initialise once; useFrame eases afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const sunDir = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    const L = look.current;
    const k = Math.min(1, dt * 1.6);
    if (scene.background instanceof THREE.Color) scene.background.lerp(tmpColor.set(L.bg), k);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.lerp(tmpColor.set(L.bg), k);
      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, L.fogNear, k);
      scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, L.fogFar, k);
    }
    const elev = timeOfDay === "dusk" ? 0.16 : 0.95;
    const az = 0.9 + (animateSun ? clock.elapsedTime * 0.025 : 0);
    sunDir.set(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev));
    if (sun.current) {
      sun.current.position.copy(sunDir).multiplyScalar(28);
      sun.current.intensity = THREE.MathUtils.lerp(sun.current.intensity, L.sun, k);
      sun.current.color.lerp(tmpColor.set(L.sunColor), k);
    }
    if (hemi.current) {
      hemi.current.intensity = THREE.MathUtils.lerp(hemi.current.intensity, L.hemi, k);
      hemi.current.color.lerp(tmpColor.set(L.hemiSky), k);
      hemi.current.groundColor.lerp(tmpColor.set(L.hemiGround), k);
    }
    const skyMat = sky.current?.material as THREE.ShaderMaterial | undefined;
    if (skyMat?.uniforms?.sunPosition) skyMat.uniforms.sunPosition.value.copy(sunDir);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={[target.hemiSky, target.hemiGround, target.hemi]} />
      <directionalLight
        ref={sun}
        intensity={target.sun}
        color={target.sunColor}
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={70}
      />
      {condition === "sunny" && (
        <Sky
          ref={sky as never}
          distance={450}
          turbidity={timeOfDay === "dusk" ? 8 : 3.5}
          rayleigh={timeOfDay === "dusk" ? 2.6 : 0.9}
          mieCoefficient={0.005}
          mieDirectionalG={0.85}
        />
      )}
      {high && <ShadowScheduler />}
      <Clouds look={look} shadows={high} />
      <Rain look={look} count={high ? 1800 : 600} />
      {high && condition !== "rainy" && (
        <Sparkles count={60} scale={[22, 3, 18]} position={[0, 1.6, 0]} size={2.6} speed={0.25} opacity={0.7} color={timeOfDay === "dusk" ? "#ffd27a" : "#fff6c4"} />
      )}
      <Environment resolution={64} frames={1} background={false}>
        <Lightformer intensity={2.2} position={[0, 6, -10]} scale={[16, 6, 1]} color="#fff8ea" />
        <Lightformer intensity={0.8} position={[10, 3, 4]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} color="#d8f3e4" />
        <Lightformer intensity={0.6} position={[-10, 2, 2]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} color="#ffe2b8" />
        <Lightformer intensity={0.4} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} color="#2f4a2a" />
      </Environment>
    </>
  );
}

/** Memoized so sensor ticks do not re-render lights, sky, clouds and rain. */
export const FarmEnvironment = memo(FarmEnvironmentImpl);
