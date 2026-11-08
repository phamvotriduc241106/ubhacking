import { Cta } from "@/components/sections/cta";
import { Features } from "@/components/sections/features";
import { Hero } from "@/components/sections/hero";
import { LivePreview } from "@/components/sections/live-preview";
import { Pipeline } from "@/components/sections/pipeline";
import { StatsBand } from "@/components/sections/stats-band";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBand />
      <Features />
      <LivePreview />
      <Pipeline />
      <Cta />
    </>
  );
}
