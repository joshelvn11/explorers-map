import type { NextConfig } from "next";

function getCloudflareRemotePattern() {
  const publicBaseUrl = process.env.EXPLORERS_MAP_CLOUDFLARE_PUBLIC_BASE_URL;

  if (!publicBaseUrl || publicBaseUrl.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(publicBaseUrl);

    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/$/, "") || ""}/**`,
    };
  } catch {
    return null;
  }
}

const cloudflareRemotePattern = getCloudflareRemotePattern();

const nextConfig: NextConfig = {
  transpilePackages: [
    "@explorers-map/db",
    "@explorers-map/services",
    "@explorers-map/utils",
  ],
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), { "better-sqlite3": "commonjs better-sqlite3" }];
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      ...(cloudflareRemotePattern ? [cloudflareRemotePattern] : []),
    ],
  },
};

export default nextConfig;
