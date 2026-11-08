import type { Metadata } from "next";
import { CropAnalysis } from "@/components/analysis/crop-analysis";

export const metadata: Metadata = { title: "AI Crop Health Analysis" };

export default function AnalysisPage() {
  return <CropAnalysis />;
}
