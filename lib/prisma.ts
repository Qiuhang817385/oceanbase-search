import { PrismaClient } from '@prisma/client'

// 全局变量，用于在开发环境中重用 Prisma 客户端实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 创建 Prisma 客户端实例
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// 在开发环境中，将客户端实例保存到全局变量中，避免热重载时创建多个实例
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
