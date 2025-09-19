/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'data.miga.manoj-shiv.tech', 'avatars.githubusercontent.com','i.scdn.co', 'static-cdn.jtvnw.net', 'cdn.discordapp.com'], // Allow Google user content images
  },
  productionBrowserSourceMaps: true
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig) 