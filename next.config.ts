import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for React PDF
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
