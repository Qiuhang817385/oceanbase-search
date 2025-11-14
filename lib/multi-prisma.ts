import { DATABASE_TABLES } from '@/constants'
import { PrismaClient } from '@prisma/client'

// 全局变量，用于在开发环境中重用 Prisma 客户端实例
const globalForPrisma = globalThis as unknown as {
  prismaMain: PrismaClient | undefined
  prismaBack: PrismaClient | undefined
}

// 主数据库客户端
export const prismaMain =
  globalForPrisma.prismaMain ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || '',
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// 备用数据库客户端
export const prismaBack =
  globalForPrisma.prismaBack ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL_BACK || '',
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// 在开发环境中，将客户端实例保存到全局变量中
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaMain = prismaMain
  globalForPrisma.prismaBack = prismaBack
}

// 多数据库管理类
export class MultiDatabaseManager {
  private static instance: MultiDatabaseManager
  private clients: Map<string, PrismaClient> = new Map()

  private constructor() {
    this.clients.set('main', prismaMain)
    this.clients.set('back', prismaBack)
  }

  public static getInstance(): MultiDatabaseManager {
    if (!MultiDatabaseManager.instance) {
      MultiDatabaseManager.instance = new MultiDatabaseManager()
    }
    return MultiDatabaseManager.instance
  }

  public getClient(databaseKey: 'main' | 'back'): PrismaClient {
    const client = this.clients.get(databaseKey)
    if (!client) {
      throw new Error(`Database client for ${databaseKey} not found`)
    }
    return client
  }

  public async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.clients.values()).map((client) => client.$disconnect())
    )
  }

  public async healthCheck(): Promise<{
    main: boolean
    back: boolean
    details: any
  }> {
    const results = {
      main: false,
      back: false,
      details: {} as any,
    }

    try {
      const mainCount = await prismaMain.movieCorpus.count()
      results.main = true
      results.details.main = { count: mainCount, status: 'healthy' }
    } catch (error: any) {
      results.details.main = { error: error.message, status: 'unhealthy' }
    }

    try {
      // 备用数据库使用不同的表名
      const backCount =
        await prismaBack.$queryRaw`SELECT COUNT(*) as count FROM ${DATABASE_TABLES.MOVIES_WITH_RATING}`
      results.back = true
      results.details.back = {
        count: Number(backCount[0].count),
        status: 'healthy',
      }
    } catch (error: any) {
      results.details.back = { error: error.message, status: 'unhealthy' }
    }

    return results
  }
}

export const multiDB = MultiDatabaseManager.getInstance()
