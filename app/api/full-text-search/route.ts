import { NextRequest, NextResponse } from 'next/server'
import { multiDB } from '@/lib/multi-prisma'
import { DATABASE_TABLES } from '@/constants'

// 配置动态路由
export const dynamic = 'force-dynamic'

// 设置请求超时时间
const REQUEST_TIMEOUT = 25000

// POST /api/full-text-search - 数据库全文搜索
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

    // 使用 Promise.race 来控制超时
    const searchPromise = performMultiDatabaseSearch({
      limit: safeLimit,
      query,
      tableName,
    })

    const result = await Promise.race([searchPromise, timeoutPromise])

    return NextResponse.json({
      success: true,
      data: {
        query,
        ...(result || {}),
      },
    })
  } catch (error: any) {
    console.error('数据库全文搜索失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '数据库全文搜索失败',
        details: error?.message || '未知错误',
      },
      { status: 500 }
    )
  }
}

// 数据库搜索函数
async function performMultiDatabaseSearch({
  limit,
  query,
  tableName,
}: {
  limit: number
  query: string
  tableName: string
}) {
  const startTime = Date.now()
  const databaseResults: any = {}
  let allResults: any[] = []
  let searchType = 'full_text_search'

  // 并行搜索所有指定的数据库
  const searchPromises = ['back'].map(async (dbKey) => {
    try {
      const client = multiDB.getClient(dbKey as 'main' | 'back')
      const results = await searchSingleDatabase({
        client,
        limit,
        query,
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
    console.error('数据库搜索执行失败:', error.message)
    throw error
  }

  const endTime = Date.now()
  const performance = {
    executionTime: endTime - startTime,
    searchType,
    databasesSearched: ['back'],
    totalResults: allResults.length,
  }

  return {
    results: allResults,
    searchType,
    message: `数据库搜索完成，共找到 ${allResults.length} 条结果`,
    performance,
    databaseResults,
  }
}

// 单个数据库搜索函数
async function searchSingleDatabase({
  client,
  limit,
  query,
  tableName,
}: {
  client: any
  limit: number
  query: string
  tableName: string
}) {
  let fullTextSearchResults: any[] = []
  let searchType = 'text_search'
  let textSearchSQL = ''

  // 根据数据库类型选择表名
  try {
    // 文本搜索
    console.log(`🔍  full-text-search 文本搜索...`)

    let searchResults: any[] = []

    // 备用数据库使用 hybrid_search 函数
    textSearchSQL = `
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
            "size":"50"
          }') 
        LIMIT ${limit}
      `

    searchResults = await client.$queryRawUnsafe(textSearchSQL)

    fullTextSearchResults = searchResults
    searchType = 'text_search'

    console.log(`✅  文本搜索成功，找到 ${fullTextSearchResults.length} 条结果`)
  } catch (textError: any) {
    console.error(`❌  文本搜索也失败:`, textError?.message)
    throw new Error(`数据库文本搜索方案都失败了`)
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
    sqlText: textSearchSQL,
  }
}
