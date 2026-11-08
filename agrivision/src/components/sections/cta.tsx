"use client";

import { ScanSearch } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="container">
      <Reveal className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-forest-800 via-forest-900 to-charcoal-900 p-8 text-cream-100 sm:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-5xl">Point your phone at a tomato. Get a second opinion.</h2>
          <p className="mt-4 text-sage-300 sm:text-lg">Combine a photo with live microclimate data for a grounded, explainable read on crop condition and ripeness.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="gold" asChild>
              <Link href="/analysis">
                <ScanSearch /> Analyze a photo
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
