import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "FolLand — Intelligent Crop Monitoring", template: "%s · FolLand" },
  description:
    "A 3D smart-farm digital twin with IoT sensor dashboards, AI crop health analysis, weather intelligence and smart recommendations for tomato growers.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07140d" },
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen overflow-x-hidden">
        <Providers>
          <div className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
          <div className="pointer-events-none fixed inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
