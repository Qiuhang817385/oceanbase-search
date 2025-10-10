import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // 移除了 output: 'export' 以支持 API 路由
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
