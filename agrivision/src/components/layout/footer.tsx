import Link from "next/link";
import { Logo } from "./logo";
import { NAV } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border/60">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            AI-assisted crop monitoring for tomato growers: a 3D digital twin, IoT sensor dashboards, photo analysis and weather intelligence.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Platform</p>
          <ul className="grid gap-2 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-foreground/80 transition-colors hover:text-primary">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">About the data</p>
          <p>Demo Mode generates simulated sensor readings in your browser. Weather comes from Open-Meteo when reachable, otherwise a labeled simulation.</p>
          <p>Photo results are labeled as AI only when a connected model analyzed the image. This prototype is decision support, not a validated agronomic diagnosis.</p>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FolLand · Intelligent Crop Monitoring & 3D Farm
      </div>
    </footer>
  );
}
