import type { Metadata } from "next";
import { WeatherIntel } from "@/components/weather/weather-intel";

export const metadata: Metadata = { title: "Weather Intelligence" };

export default function WeatherPage() {
  return <WeatherIntel />;
}
