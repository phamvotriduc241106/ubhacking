"use client";

import { LocalizedText } from "@/i18n/localized";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function StatusPill({ className }: { className?: string }) {
  const mode = useApp((s) => s.mode);
  const connection = useApp((s) => s.connection);
  const message = useApp((s) => s.connectionMessage);
  const latest = useApp((s) => s.latest);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const state = !mounted
    ? { dot: "bg-muted-foreground", text: "…", tip: "Loading" }
    : mode === "demo"
      ? { dot: "bg-gold-400", text: "Demo Mode", tip: "Showing realistic simulated sensor data. Switch to Integration Mode on the dashboard to connect real sensors." }
      : connection === "connected"
        ? latest?.origin === "backend-simulated"
          ? { dot: "bg-gold-400", text: "Connected · simulated", tip: message ?? "Endpoint reachable, but it reports simulated data." }
          : { dot: "bg-emerald-400", text: "Live sensors", tip: "Receiving live readings from your sensor endpoint." }
        : connection === "connecting"
          ? { dot: "bg-yellow-400", text: "Connecting…", tip: "Contacting your sensor endpoint." }
          : { dot: "bg-red-500", text: "Sensor offline", tip: message ?? "The sensor endpoint did not respond." };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/dashboard#integration"
          className={cn("glass inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-semibold tracking-wide", className)}
        >
          <span className="relative flex h-2 w-2">
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", state.dot)} />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", state.dot)} />
          </span>
          <LocalizedText text={state.text} />
        </Link>
      </TooltipTrigger>
      <TooltipContent><LocalizedText text={state.tip} /></TooltipContent>
    </Tooltip>
  );
}
