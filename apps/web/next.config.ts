import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@explorers-map/db",
    "@explorers-map/services",
    "@explorers-map/utils",
  ],
};

export default nextConfig;
