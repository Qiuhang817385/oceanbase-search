import { NextRequest, NextResponse } from 'next/server'
import { multiDB } from '@/lib/multi-prisma'
import { DATABASE_TABLES, DATABASE_KEYS, getTableName } from '@/constants'

// 配置动态路由
export const dynamic = 'force-dynamic'

// 设置请求超时时间
const REQUEST_TIMEOUT = 25000

// POST /api/multi-hybrid-search - 多数据库向量搜索
export async function POST(request: NextRequest) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求超时')), REQUEST_TIMEOUT)
  })

  try {
    const {
      query,
      limit = 10,
      databases = ['main', 'back'],
    } = await request.json()

    if (!query) {
      return NextResponse.json(
        { success: false, error: '缺少查询内容' },
        { status: 400 }
      )
    }

    const safeLimit = Math.min(limit, 20)

    // 使用 Promise.race 来控制超时
    const searchPromise = performMultiDatabaseSearch(
      safeLimit,
      query,
      databases
    )

    const result = await Promise.race([searchPromise, timeoutPromise])

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: result.results,
        total: result.results.length,
        searchType: result.searchType,
        message: result.message,
        performance: result.performance,
        databaseResults: result.databaseResults,
      },
    })
  } catch (error: any) {
    console.error('多数据库向量搜索失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '多数据库向量搜索失败',
        details: error?.message || '未知错误',
      },
      { status: 500 }
    )
  }
}

// 多数据库向量搜索函数
async function performMultiDatabaseSearch(
  limit: number,
  query: string,
  databases: string[]
) {
  const startTime = Date.now()
  const databaseResults: any = {}
  let allResults: any[] = []
  let searchType = 'multi_database_search'

  // 并行搜索所有指定的数据库
  const searchPromises = databases.map(async (dbKey) => {
    try {
      const client = multiDB.getClient(dbKey as 'main' | 'back')
      const results = await searchSingleDatabase(client, limit, query, dbKey)

      databaseResults[dbKey] = {
        success: true,
        count: results.length,
        searchType: results.searchType,
        results: results.results,
      }
      return results.results
    } catch (error: any) {
      console.error(`数据库 ${dbKey} 搜索失败:`, error.message)
      databaseResults[dbKey] = {
        success: false,
        error: error.message,
        count: 0,
        results: [],
      }
      return []
    }
  })

  try {
    const resultsArrays = await Promise.all(searchPromises)

    // 合并所有结果
    allResults = resultsArrays.flat()

    // 按相似度排序（如果有 distance 字段）
    allResults.sort((a, b) => {
      const distanceA = a.distance || 1
      const distanceB = b.distance || 1
      return distanceA - distanceB
    })

    // 限制最终结果数量
    allResults = allResults.slice(0, limit)
  } catch (error: any) {
    console.error('多数据库搜索执行失败:', error.message)
    throw error
  }

  const endTime = Date.now()
  const performance = {
    executionTime: endTime - startTime,
    searchType,
    databasesSearched: databases,
    totalResults: allResults.length,
  }

  return {
    results: allResults,
    searchType,
    message: `多数据库搜索完成，共找到 ${allResults.length} 条结果`,
    performance,
    databaseResults,
  }
}

// 单个数据库搜索函数
async function searchSingleDatabase(
  client: any,
  limit: number,
  query: string,
  dbKey: string
) {
  let fullTextSearchResults: any[] = []
  let searchType = 'text_search'

  // 根据数据库类型选择表名
  const tableName = getTableName(dbKey)

  try {
    // 方案3: 回退到文本搜索
    console.log(`🔍 [${dbKey}] full-text-search 文本搜索...`)

    let searchResults: any[] = []

    if (dbKey === 'back') {
      // 备用数据库使用 hybrid_search 函数
      const textSearchSQL = `
        SELECT * FROM hybrid_search('${DATABASE_TABLES.MOVIES_WITH_RATING}', 
          '{
            "query": {
              "query_string": {
                "fields": [
                  "directors^2.5", 
                  "actors^2.5", 
                  "genres^1.5", 
                  "summary"
                ], 
                "query": "${query}"
              }
            }
          }') 
        LIMIT 10
      `
      searchResults = await client.$queryRawUnsafe(textSearchSQL)
    } else {
      // 主数据库使用 Prisma ORM
      searchResults = await client.movieCorpus.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { summary: { contains: query } },
            { originalTitle: { contains: query } },
          ],
        },
        take: limit,
        select: {
          id: true,
          title: true,
          originalTitle: true,
          summary: true,
          year: true,
          genres: true,
          directors: true,
          actors: true,
          ratingScore: true,
          ratingCount: true,
          images: true,
        },
        orderBy: {
          ratingScore: 'desc',
        },
      })
    }

    fullTextSearchResults = searchResults
    searchType = 'text_search'

    console.log(
      `✅ [${dbKey}] 文本搜索成功，找到 ${fullTextSearchResults.length} 条结果`
    )
  } catch (textError: any) {
    console.error(`❌ [${dbKey}] 文本搜索也失败:`, textError?.message)
    throw new Error(`数据库 ${dbKey} 文本搜索方案都失败了`)
  }

  // 处理 BigInt 序列化问题
  const processedResults = fullTextSearchResults.map((result) => ({
    ...result,
    id: result.id ? String(result.id) : result.id,
    movie_id: result.movie_id ? String(result.movie_id) : result.movie_id,
  }))

  return {
    results: processedResults,
    searchType,
  }
}

// GET /api/multi-hybrid-search - 获取多数据库配置和健康状态
export async function GET() {
  try {
    const healthCheck = await multiDB.healthCheck()

    return NextResponse.json({
      success: true,
      config: {
        databases: {
          main: {
            url: process.env.DATABASE_URL ? 'configured' : 'not configured',
            status: healthCheck.main ? 'healthy' : 'unhealthy',
          },
          back: {
            url: process.env.DATABASE_URL_BACK
              ? 'configured'
              : 'not configured',
            status: healthCheck.back ? 'healthy' : 'unhealthy',
          },
        },
        embeddingProvider: process.env.EMBEDDING_PROVIDER,
        embeddingModel: process.env.EMBEDDING_MODEL,
        dimensions: process.env.DIMENSIONS,
        baseUrl: process.env.BASE_URL,
        timeout: REQUEST_TIMEOUT,
      },
      health: healthCheck,
    })
  } catch (error: any) {
    console.error('获取多数据库配置失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取配置失败',
        details: error?.message || '未知错误',
      },
      { status: 500 }
    )
  }
}
