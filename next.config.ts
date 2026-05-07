import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  allowedDevOrigins: [
    "*.cloudworkstations.dev",
    "*.idx.dev",
  ],
};

export default nextConfig;
