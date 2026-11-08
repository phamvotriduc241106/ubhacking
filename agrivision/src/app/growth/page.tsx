import type { Metadata } from "next";
import { GrowthTimeline } from "@/components/growth/growth-timeline";

export const metadata: Metadata = { title: "3D Crop Growth Timeline" };

export default function GrowthPage() {
  return <GrowthTimeline />;
}
