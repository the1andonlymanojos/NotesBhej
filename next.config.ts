import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: "./empty-module.ts",
      },
    },
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
};


export default nextConfig;
