import { PrismaClient } from '@prisma/client'

// 全局变量，用于在开发环境中重用 Prisma 客户端实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 检查数据库 URL 是否存在
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL 环境变量未设置。请在 Vercel 控制台中配置此环境变量。'
  )
}

// 创建 Prisma 客户端实例，针对 Vercel 无服务器环境优化
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

// 在开发环境中，将客户端实例保存到全局变量中，避免热重载时创建多个实例
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
