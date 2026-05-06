import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.cloudworkstations.dev",
    "*.idx.dev",
  ],
};

export default nextConfig;
