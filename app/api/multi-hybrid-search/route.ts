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

// POST /api/multi-hybrid-search - 数据库混合搜索
export async function POST(request: NextRequest) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求超时')), REQUEST_TIMEOUT)
  })

  try {
    const {
      query,
      limit = 10,
      hybridRadio = 0.7,
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
      query,
      hybridRadio,
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
    console.error('混合搜索失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '混合搜索失败',
        details: error?.message || '未知错误',
      },
      { status: 500 }
    )
  }
}

// 数据库混合搜索函数
async function performMultiDatabaseSearch({
  queryEmbedding,
  limit,
  query,
  hybridRadio,
  tableName,
}: {
  queryEmbedding: number[]
  limit: number
  query: string
  hybridRadio: number
  tableName: string
}) {
  const startTime = Date.now()
  const databaseResults: any = {}
  let allResults: any[] = []
  let searchType = 'multi_database_search'

  // 并行搜索所有指定的数据库
  const searchPromises = ['back'].map(async (dbKey) => {
    try {
      const client = multiDB.getClient(dbKey as 'main' | 'back')
      const results = await searchSingleDatabase({
        client,
        queryEmbedding,
        limit,
        query,
        hybridRadio,
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
    console.error('数据库混合搜索执行失败:', error.message)
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
    message: `数据库混合搜索完成，共找到 ${allResults.length} 条结果`,
    performance,
    databaseResults,
  }
}

// 单个数据库搜索函数
async function searchSingleDatabase({
  client,
  queryEmbedding,
  limit,
  query,
  hybridRadio,
  tableName,
}: {
  client: any
  queryEmbedding: number[]
  limit: number
  query: string
  hybridRadio: number
  tableName: string
}) {
  let vectorResults: any[] = []
  let searchType = 'multi-hybrid-search'
  let vectorSearchSQL = ''
  let vectorSearchSQLText = ''

  try {
    console.log(`🔍 multi-hybrid-search 混合搜索...`)

    vectorSearchSQL = `
        SELECT * FROM hybrid_search('${tableName}',
          '{
            "query": {
              "query_string": {
                "fields": [
                  "directors^2.5", 
                  "actors^2.5", 
                  "genres^2.5", 
                  "summary"
                ],
                "query": "${query}"
              }
            },
            "knn": [{
              "field": "embedding",
              "k": 50,
              "num_candidates": 100,
              "query_vector": [${queryEmbedding.join(',')}]
            },
            {
              "field": "embedding",
              "k": 50,
              "boost" : "0.3",
              "num_candidates": 100,
              "query_vector": [${queryEmbedding.join(',')}],
              "filter" : {
                  "query_string": {
                    "fields": [
                      "directors", 
                      "actors", 
                      "genres", 
                    ], 
                    "query": "${query}"
                  },
              }
            }],
            "rank": {
              "rrf": {}
            },
            "hybrid_radio": "${hybridRadio}",
            "size":"50"
          }')

        LIMIT ${limit}
      `

    vectorSearchSQLText = `
      SELECT * FROM hybrid_search('${tableName}',
        '{
          "query": {
            "query_string": {
              "fields": [
                "directors^2.5",
                "actors^2.5",
                "genres^2.5",
                "summary"
              ],
              "query": "${query}"
            }
          },
          "knn": [{
            "field": "embedding",
            "k": 50,
            "num_candidates": 100,
            "query_vector": [$queryEmbedding]
          },
          {
            "field": "embedding",
            "k": 50,
            "boost" : "0.3",
            "num_candidates": 100,
            "query_vector": [$queryEmbedding],
            "filter" : {
                "query_string": {
                  "fields": [
                      "directors", 
                      "actors", 
                      "genres", 
                  ], 
                  "query": "${query}"
                },
            }
          }],
          "rank": {
            "rrf": {}
          },
          "hybrid_radio": "${hybridRadio}",
          "size":"50"
        }')

      LIMIT ${limit}
    `

    vectorResults = await client.$queryRawUnsafe(vectorSearchSQL)

    console.log(`✅ 混合搜索成功，找到 ${vectorResults.length} 条结果`)
  } catch (vectorError: any) {
    console.log(`❌ 混合搜索失败:`, vectorError?.message)
  }

  // 处理 BigInt 序列化问题
  const processedResults = vectorResults.map((result) => ({
    ...result,
    id: result.id ? String(result.id) : result.id,
    movie_id: result.movie_id ? String(result.movie_id) : result.movie_id,
  }))

  return {
    results: processedResults,
    sqlText: vectorSearchSQLText,
    searchType,
    hybridRadio,
  }
}
