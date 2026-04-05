import type { NextConfig } from "next";

// Parse the CDN/S3 asset base URL from env so next/image can optimise and serve
// images from that origin. Falls back gracefully if the env var is not set (local dev).
function parseRemotePatterns(): NextConfig["images"] {
  const raw = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (!raw) return undefined;

  try {
    const { protocol, hostname, port } = new URL(raw);
    const proto = protocol.replace(":", "") as "https" | "http";
    return {
      // Skip optimization for HTTP assets — Next.js image optimizer runs server-side
      // inside Docker where localhost resolves to 127.0.0.1 (blocked as private IP).
      unoptimized: proto === "http",
      remotePatterns: [
        {
          protocol: proto,
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
