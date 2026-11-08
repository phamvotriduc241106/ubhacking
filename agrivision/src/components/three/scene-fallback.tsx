"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sprout } from "lucide-react";

export function SceneLoader({ hidden = false }: { hidden?: boolean }) {
  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          className="absolute inset-0 z-10 grid place-items-center bg-gradient-to-b from-forest-900 via-forest-950 to-black"
        >
          <div className="flex flex-col items-center gap-4 text-cream-100">
            <div className="relative grid h-16 w-16 place-items-center">
              <span className="absolute inset-0 rounded-full border border-emerald-400/30" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400" />
              <Sprout className="h-6 w-6 text-emerald-300" />
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-sage-300">Growing digital twin</p>
            <div className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent bg-[length:200%_100%]" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Static illustration for browsers without WebGL. */
export function SceneFallback() {
  const rows = [0, 1, 2, 3];
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#bfe0ea] to-[#5b8f45] dark:from-[#2a2a35] dark:to-[#1d3a22]">
      <svg viewBox="0 0 800 450" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <circle cx="640" cy="90" r="46" fill="#ffe7a3" opacity="0.9" />
        {rows.map((r) => (
          <g key={r} transform={`translate(0 ${250 + r * 48})`}>
            <rect x="40" y="18" width="720" height="16" rx="6" fill="#5a3f2a" opacity={0.9 - r * 0.08} />
            {Array.from({ length: 12 }).map((_, i) => (
              <g key={i} transform={`translate(${70 + i * 58} 18)`}>
                <path d="M0 0 C -14 -18, -8 -34, 0 -44 C 8 -34, 14 -18, 0 0" fill="#2f7a34" />
                <path d="M0 -14 C 14 -26, 20 -30, 22 -24" stroke="#3d8b3a" strokeWidth="6" fill="none" strokeLinecap="round" />
                {r > 1 && <circle cx="8" cy="-20" r="6" fill={r === 3 ? "#d4372a" : "#e3a33b"} />}
              </g>
            ))}
          </g>
        ))}
      </svg>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs text-white backdrop-blur">
        3D view unavailable on this device — showing a static preview
      </div>
    </div>
  );
}
