import type { NextConfig } from "next";

// Parse the CDN/S3 asset base URL from env so next/image can optimise and serve
// images from that origin. Falls back gracefully if the env var is not set (local dev).
function parseRemotePatterns(): NextConfig["images"] {
  const raw = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (!raw) return undefined;

  try {
    const { protocol, hostname, port } = new URL(raw);
    return {
      remotePatterns: [
        {
          protocol: protocol.replace(":", "") as "https" | "http",
          hostname,
          port: port || undefined,
          pathname: "/**",
        },
      ],
    };
  } catch {
    return undefined;
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: parseRemotePatterns(),
};

export default nextConfig;
