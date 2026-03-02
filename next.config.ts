import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    unoptimized: true, // Crucial for Cloudflare Free Tier
  },
  eslint: {
    ignoreDuringBuilds: true, // Prevents tiny code style errors from stopping deployment
  },
};

export default nextConfig;