import type { Metadata } from "next";
import { Recommendations } from "@/components/alerts/recommendations";

export const metadata: Metadata = { title: "Smart Recommendations & Alerts" };

export default function AlertsPage() {
  return <Recommendations />;
}
