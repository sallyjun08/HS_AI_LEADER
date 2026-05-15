import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // output: "export" removed — API Routes require server-side rendering
  allowedDevOrigins: [
    "*.cloudworkstations.dev",
    "*.idx.dev",
    "3001-firebase-hsaileader-1777025836179.cluster-xpmcxs2fjnhg6xvn446ubtgpio.cloudworkstations.dev",
  ],
};

export default nextConfig;
