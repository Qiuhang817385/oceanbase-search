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
  images: {},
  webpack: (config, { dev, isServer }) => {
    // 统一处理 resolve.fallback（服务端和客户端都需要）
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // 忽略 node-pre-gyp 的可选依赖
      nock: false,
      'aws-sdk': false,
      'mock-aws-s3': false,
    }

    // 在服务端：排除整个 @mapbox/node-pre-gyp 的 s3_setup.js
    // 因为它在运行时不会被使用（这些依赖是测试/发布工具用的）
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // 如果可能，别名化这些模块为空对象
      }

      // 添加 NormalModuleReplacementPlugin 来替换问题文件
      const webpack = require('webpack')
      config.plugins = config.plugins || []
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /node_modules\/@mapbox\/node-pre-gyp\/lib\/util\/s3_setup\.js$/,
          require.resolve('./lib/webpack-stubs/s3_setup-stub.js')
        )
      )
    } else {
      // 客户端：完全排除 nodejieba
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push({
          nodejieba: 'commonjs nodejieba',
          '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
        })
      } else {
        config.externals = [
          config.externals,
          {
            nodejieba: 'commonjs nodejieba',
            '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
          },
        ]
      }
    }

    // 忽略 .html 文件
    config.module.rules.push({
      test: /node_modules\/@mapbox\/node-pre-gyp\/.*\.html$/,
      use: 'ignore-loader',
    })

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
}

export default nextConfig
