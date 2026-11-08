"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SensorEngine } from "./sensor-engine";
import { ScenePrefetcher } from "./scene-prefetcher";
import { LanguageProvider } from "@/i18n/provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider><ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={150}>
        <SensorEngine />
        <ScenePrefetcher />
        {children}
      </TooltipProvider>
    </ThemeProvider></LanguageProvider>
  );
}
