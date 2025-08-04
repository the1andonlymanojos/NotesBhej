import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

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

// Pass your config object into the withBundleAnalyzer function
export default withBundleAnalyzer(nextConfig);