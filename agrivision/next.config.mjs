/** @type {import('next').NextConfig} */
const FOLLAND_API = process.env.FOLLAND_API_URL || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  async rewrites() {
    // Optional bridge to the existing FolLand FastAPI backend (sensors + Gemini analysis).
    return [{ source: "/api/folland/:path*", destination: `${FOLLAND_API}/api/:path*` }];
  },
};

export default nextConfig;
