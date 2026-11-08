"use client";

import { useThree } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { Component, useEffect, useRef, type ReactNode } from "react";
import { SceneFallback } from "./scene-fallback";

/**
 * Compiles every shader program in the scene before the loader is hidden.
 *
 * Without this, the first rendered frame compiles a dozen programs synchronously and
 * freezes the main thread (the loader fade stalls, the page stutters). compileAsync uses
 * KHR_parallel_shader_compile where available so compilation happens off the main thread.
 */
export function SceneReady({ onReady, timeoutMs = 6000 }: { onReady: () => void; timeoutMs?: number }) {
  const { gl, scene, camera } = useThree();
  const done = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled || done.current) return;
      done.current = true;
      // Two frames: one to draw with compiled programs, one to present it.
      requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && onReady()));
    };
    const timer = window.setTimeout(finish, timeoutMs);
    // Wait one frame so all children (plants, ground, sky) have mounted into the scene.
    const raf = requestAnimationFrame(() => {
      gl.compileAsync(scene, camera).then(finish, finish);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);
  return null;
}

/** Remounts the canvas if the browser drops the WebGL context (GPU reset, sleep, too many tabs). */
export function ContextLossGuard({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    el.addEventListener("webglcontextlost", lost);
    return () => el.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}

interface BoundaryState {
  error: Error | null;
}

/** Keeps a 3D failure from taking down the page; shows the static preview with a retry button. */
export class SceneBoundary extends Component<{ children: ReactNode; onRetry?: () => void; onError?: () => void }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[3D] scene crashed, showing fallback:", error);
    // The scene will never report "ready", so let the parent hide its loading overlay;
    // otherwise the loader would cover the fallback forever.
    this.props.onError?.();
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="relative h-full w-full">
        <SceneFallback />
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            this.props.onRetry?.();
          }}
          className="absolute left-1/2 top-4 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-black/70"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Retry 3D view
        </button>
      </div>
    );
  }
}
