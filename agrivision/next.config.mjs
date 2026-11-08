/** @type {import('next').NextConfig} */
const FOLLAND_API = process.env.FOLLAND_API_URL || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Import only the modules actually used from these barrel-heavy packages.
    // (lucide-react and recharts are already optimized by Next.js by default.)
    optimizePackageImports: ["@react-three/drei", "framer-motion", "@radix-ui/react-tooltip", "@radix-ui/react-dialog"],
  },
  compiler: {
    // Strip debug logging from production bundles; keep errors and warnings.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async rewrites() {
    // Optional bridge to the existing FolLand FastAPI backend (sensors + Gemini analysis).
    return [{ source: "/api/folland/:path*", destination: `${FOLLAND_API}/api/:path*` }];
  },
  async headers() {
    // Self-hosted fonts and icons never change between builds of the same name.
    return [{ source: "/:file(favicon.svg)", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] }];
  },
};

export default nextConfig;
