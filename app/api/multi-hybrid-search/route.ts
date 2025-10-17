import { NextRequest, NextResponse } from 'next/server'
import { multiDB } from '@/lib/multi-prisma'
import { initializeModel } from '@/middleware/model.js'

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
    const { model } = await initializeModel()
    const queryEmbedding = await model.embed(query)

    // 使用 Promise.race 来控制超时
    const searchPromise = performMultiDatabaseSearch(
      queryEmbedding,
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
        embeddingDimensions: queryEmbedding.length,
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
  queryEmbedding: number[],
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
      const results = await searchSingleDatabase(
        client,
        queryEmbedding,
        limit,
        query,
        dbKey
      )

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
    embeddingDimensions: queryEmbedding.length,
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
  queryEmbedding: number[],
  limit: number,
  query: string,
  dbKey: string
) {
  let vectorResults: any[] = []
  let searchType = 'text_search'

  // 根据数据库类型选择表名
  const tableName = dbKey === 'back' ? 'movies_with_rating' : 'movie_corpus'

  try {
    // 方案1: 使用 embedding 字段进行向量搜索
    console.log(`🔍 [${dbKey}] 尝试使用 embedding 字段进行向量搜索...`)

    let vectorSearchSQL = ''

    if (dbKey === 'back') {
      vectorSearchSQL = `
      SELECT * FROM hybrid_search('movies_with_rating', 
      '{"query": {"query_string": {"fields": 
      ["directors", "actors^2.5", "tags^2", "genres^1.5", "summary^3"], 
      "query": "${query}", 
      }}, 
      "knn": {"field": "embedding", "k": 20, "num_candidates": 100, "query_vector": [${queryEmbedding.join(
        ','
      )}]}, 
       "rank": {"rrf": {}}}') LIMIT 10
    `
    } else {
      vectorSearchSQL = `
      SELECT 
        id, 
        title, 
        original_title,
        summary, 
        countries,
        languages,
        year, 
        genres,
        directors,
        actors,
        rating_score,
        rating_count,
        images,
        l2_distance(embedding, JSON_ARRAY(${queryEmbedding
          .map(() => '?')
          .join(',')})) as distance
      FROM ${tableName} 
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ?
    `
    }

    vectorResults = await client.$queryRawUnsafe(vectorSearchSQL)

    searchType = 'multi-hybrid-search'

    console.log(
      `✅ [${dbKey}] 向量搜索成功，找到 ${vectorResults.length} 条结果`
    )
  } catch (vectorError: any) {
    console.log(
      `❌ [${dbKey}] embedding 字段向量搜索失败:`,
      vectorError?.message
    )

    try {
      // 方案2: 使用 summary_embedding 字段进行向量搜索
      console.log(
        `🔍 [${dbKey}] 尝试使用 summary_embedding 字段进行向量搜索...`
      )

      const summaryVectorSQL = `
          SELECT 
            id, 
            title, 
            original_title,
            summary, 
            year, 
            genres,
            directors,
            actors,
            rating_score,
            rating_count,
            images,
            l2_distance(JSON_EXTRACT(summary_embedding, '$'), JSON_ARRAY(${queryEmbedding
              .map(() => '?')
              .join(',')})) as distance
          FROM ${tableName} 
          WHERE summary_embedding IS NOT NULL 
            AND summary_embedding != ''
            AND JSON_VALID(summary_embedding) = 1
          ORDER BY distance ASC
          LIMIT ?
        `

      vectorResults = await client.$queryRawUnsafe(summaryVectorSQL)
      searchType = 'vector_search_summary'

      console.log(
        `✅ [${dbKey}] summary_embedding 向量搜索成功，找到 ${vectorResults.length} 条结果`
      )
    } catch (summaryVectorError: any) {
      console.log(
        `❌ [${dbKey}] summary_embedding 字段向量搜索也失败:`,
        summaryVectorError?.message
      )

      try {
        // 方案3: 回退到文本搜索
        console.log(`🔍 [${dbKey}] 回退到文本搜索...`)

        let searchResults: any[] = []

        if (dbKey === 'back') {
          // 备用数据库使用原生 SQL，注意字段名差异
          const textSearchSQL = `
              SELECT 
                id, 
                title, 
                original_title,
                summary, 
                year, 
                genres,
                directors,
                actors,
                rating as rating_score,
                NULL as rating_count,
                NULL as images
              FROM ${tableName} 
              WHERE title LIKE ? 
                OR summary LIKE ? 
                OR original_title LIKE ?
              ORDER BY rating DESC
              LIMIT ?
            `
          const searchTerm = `%${query}%`
          searchResults = await client.$queryRawUnsafe(
            textSearchSQL,
            searchTerm,
            searchTerm,
            searchTerm,
            limit
          )
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

        vectorResults = searchResults
        searchType = 'text_search'

        console.log(
          `✅ [${dbKey}] 文本搜索成功，找到 ${vectorResults.length} 条结果`
        )
      } catch (textError: any) {
        console.error(`❌ [${dbKey}] 文本搜索也失败:`, textError?.message)
        throw new Error(`数据库 ${dbKey} 所有搜索方案都失败了`)
      }
    }
  }

  // 处理 BigInt 序列化问题
  const processedResults = vectorResults.map((result) => ({
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
