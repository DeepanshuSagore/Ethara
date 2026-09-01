import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone for the Docker runtime stage to copy. Vercel
  // ignores this setting, so the existing deployment is unaffected.
  output: "standalone",
};

export default nextConfig;
