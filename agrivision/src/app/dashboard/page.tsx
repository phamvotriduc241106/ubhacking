import type { Metadata } from "next";
import { SensorDashboard } from "@/components/dashboard/sensor-dashboard";

export const metadata: Metadata = { title: "IoT Sensor Dashboard" };

export default function DashboardPage() {
  return <SensorDashboard />;
}
