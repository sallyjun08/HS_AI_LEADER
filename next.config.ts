import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.cloudworkstations.dev",
    "*.idx.dev",
    "*.cluster-xpmcxs2fjnhg6xvn446ubtgpio.cloudworkstations.dev",
  ],
};

export default nextConfig;
