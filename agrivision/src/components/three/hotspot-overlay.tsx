"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";

/** Project accessible HTML over the canvas with safe nested-root cleanup. */
export function HotspotOverlay({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  const { gl, camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const node = useRef<HTMLDivElement | null>(null);
  const root = useRef<Root | null>(null);
  const projected = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    const target = gl.domElement.parentElement;
    if (!target) return;
    const element = document.createElement("div");
    element.dataset.follandHotspot = "true";
    element.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:30;";
    target.appendChild(element);
    const mountedRoot = createRoot(element);
    node.current = element;
    root.current = mountedRoot;
    return () => {
      node.current = null;
      root.current = null;
      // React 19 warns if one root is unmounted while another is rendering.
      // Each mount owns its element, including Strict Mode remounts.
      queueMicrotask(() => {
        mountedRoot.unmount();
        element.remove();
      });
    };
  }, [gl]);

  useLayoutEffect(() => {
    root.current?.render(<div style={{ transform: "translate(-50%, -50%)", pointerEvents: "none" }}>{children}</div>);
  }, [children]);

  useFrame(() => {
    if (!group.current || !node.current) return;
    group.current.getWorldPosition(projected.current);
    projected.current.project(camera);
    const p = projected.current;
    node.current.style.display = p.z < -1 || p.z > 1 ? "none" : "block";
    node.current.style.transform = `translate3d(${(p.x * 0.5 + 0.5) * size.width}px, ${(-p.y * 0.5 + 0.5) * size.height}px, 0)`;
  });

  return <group ref={group} position={position} />;
}
