import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/static' : '',
  // env: {
  //   ASSET_PREFIX: process.env.NODE_ENV === 'production' ? '/static' : '',
  // },
}

export default nextConfig
