import { NextRequest, NextResponse } from 'next/server'
import { multiDB } from '@/lib/multi-prisma'
import { initializeModel } from '@/middleware/model.js'
import { DATABASE_TABLES } from '@/constants'

type MultiDBResponse = {
  results: any[]
  searchType: string
  message: string
  performance: any
  databaseResults: Record<string, any>
}

// 配置动态路由
export const dynamic = 'force-dynamic'

// 设置请求超时时间
const REQUEST_TIMEOUT = 25000

// POST /api/vector-search - 数据库向量搜索
export async function POST(request: NextRequest) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求超时')), REQUEST_TIMEOUT)
  })

  try {
    const {
      query,
      limit = 10,
      tableName = DATABASE_TABLES.MOVIES_WITH_RATING,
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
    const searchPromise = performMultiDatabaseSearch({
      queryEmbedding,
      limit: safeLimit,
      tableName,
    })
    const result = (await Promise.race([
      searchPromise,
      timeoutPromise,
    ])) as MultiDBResponse

    return NextResponse.json({
      success: true,
      data: {
        query,
        embeddingDimensions: queryEmbedding.length,
        ...(result || {}),
      },
    })
  } catch (error: any) {
    console.error('向量搜索失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '向量搜索失败',
        details: error?.message || '未知错误',
      },
      { status: 500 }
    )
  }
}

// 数据库向量搜索函数
async function performMultiDatabaseSearch({
  queryEmbedding,
  limit,
  tableName,
}: {
  queryEmbedding: number[]
  limit: number
  tableName: string
}) {
  const startTime = Date.now()
  const databaseResults: any = {}
  let allResults: any[] = []
  let searchType = 'vector-search'

  // 并行搜索所有指定的数据库
  const searchPromises = ['back'].map(async (dbKey) => {
    try {
      const client = multiDB.getClient(dbKey as 'main' | 'back')
      const results = await searchSingleDatabase({
        client,
        queryEmbedding,
        limit,
        tableName,
      })

      databaseResults[dbKey] = {
        success: true,
        count: results.results.length,
        ...(results || {}),
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
  } catch (error: any) {
    console.error('向量搜索执行失败:', error.message)
    throw error
  }

  const endTime = Date.now()
  const performance = {
    executionTime: endTime - startTime,
    searchType,
    embeddingDimensions: queryEmbedding.length,
    totalResults: allResults.length,
  }

  return {
    results: allResults,
    searchType,
    message: `向量搜索完成，共找到 ${allResults.length} 条结果`,
    performance,
    databaseResults,
  }
}

// 单个数据库搜索函数
async function searchSingleDatabase({
  client,
  queryEmbedding,
  limit,
  tableName,
}: {
  client: any
  queryEmbedding: number[]
  limit: number
  tableName: string
}) {
  let vectorResults: any[] = []
  let searchType = 'vector-search'
  let vectorSearchSQL = ''
  let vectorSearchSQLText = ''

  try {
    // 使用 embedding 字段进行向量搜索
    vectorSearchSQL = `
      SELECT * FROM hybrid_search('${tableName}', 
        '{
          "knn": {
            "field": "embedding", 
            "query_vector": [${queryEmbedding.join(',')}], 
            "k": 50,
            "num_candidates": 100
          },
          "size":"50"
        }') 
      LIMIT ${limit}
    `

    vectorSearchSQLText = `
      SELECT * FROM hybrid_search('${tableName}', 
        '{
          "knn": {
            "field": "embedding", 
            "query_vector": [$queryEmbedding], 
            "k": 50,
            "num_candidates": 100
          },
          "size":"50"
        }') 
      LIMIT ${limit}
    `

    vectorResults = await client.$queryRawUnsafe(vectorSearchSQL)

    console.log(`✅ 向量搜索成功，找到 ${vectorResults.length} 条结果`)
  } catch (vectorError: any) {
    console.log(`❌ 向量搜索失败:`, vectorError?.message)
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
    sqlText: vectorSearchSQLText,
  }
}
