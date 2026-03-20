/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['lh3.googleusercontent.com', 'data.miga.manoj-shiv.tech', 'avatars.githubusercontent.com','i.scdn.co', 'static-cdn.jtvnw.net', 'cdn.discordapp.com', 's3.manoj-shiv.tech'], // Allow Google user content images
  },
  compiler: {
    // removeConsole: process.env.NODE_ENV === 'production',  
    // or exclude certain types:
    //removeConsole: { exclude: ['error'] }
  },
  productionBrowserSourceMaps: true,
  async rewrites() {
    return [
      {
        source: '/springboot/:path*',
        destination: 'http://localhost:8080/:path*',
      },
    ]
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig) 