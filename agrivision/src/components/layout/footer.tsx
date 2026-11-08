"use client";
import { Localized } from "@/i18n/localized";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Logo } from "./logo";
import { NAV } from "@/lib/nav";

export function Footer() {
  const {t}=useTranslation();
  return (
    <footer className="relative mt-24 border-t border-border/60">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground"><Localized id="ui_cb18c1e4f94a0bea" fallback="AI-assisted crop monitoring for tomato growers: a 3D digital twin, IoT sensor dashboards, photo analysis and weather intelligence." /></p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><Localized id="ui_c78ffe19571018fb" fallback="Platform" /></p>
          <ul className="grid gap-2 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-foreground/80 transition-colors hover:text-primary">
                  {t(n.href.slice(1), { defaultValue: n.label })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]"><Localized id="ui_9b8197f3d9d1b528" fallback="About the data" /></p>
          <p><Localized id="ui_6779a62f2fca38e1" fallback="Demo Mode generates simulated sensor readings in your browser. Weather comes from Open-Meteo when reachable, otherwise a labeled simulation." /></p>
          <p><Localized id="ui_fcd46e4b7c36180e" fallback="Photo results are labeled as AI only when a connected model analyzed the image. This prototype is decision support, not a validated agronomic diagnosis." /></p>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}{" "}<Localized id="ui_6130d5a5c619111d" fallback="FolLand · Intelligent Crop Monitoring & 3D Farm" /></div>
    </footer>
  );
}
