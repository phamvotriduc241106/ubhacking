import type { Metadata } from "next";
import { FarmTwin } from "@/components/farm/farm-twin";

export const metadata: Metadata = { title: "Smart Farm Digital Twin" };

export default function FarmPage() {
  return <FarmTwin />;
}
