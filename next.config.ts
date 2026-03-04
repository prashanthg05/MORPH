import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Crucial for Cloudflare Free Tier
  },
};

export default nextConfig;
