import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // 移除了 output: 'export' 以支持 API 路由
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'react', 'react-dom'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img1.doubanio.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img9.doubanio.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // 生产环境优化
      config.optimization.minimize = true

      // 代码分割优化
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Ant Design单独打包
          antd: {
            test: /[\\/]node_modules[\\/]antd[\\/]/,
            name: 'antd',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          // React相关库
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          // Next.js 相关
          nextjs: {
            test: /[\\/]node_modules[\\/]next[\\/]/,
            name: 'nextjs',
            chunks: 'all',
            priority: 9,
            enforce: true,
          },
          // 其他第三方库
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 5,
            enforce: true,
          },
        },
      }
    }
    return config
  },
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/static' : '',
  // env: {
  //   ASSET_PREFIX: process.env.NODE_ENV === 'production' ? '/static' : '',
  // },
}

export default nextConfig
