import { NextRequest, NextResponse } from 'next/server'
import { multiDB } from '@/lib/multi-prisma'

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
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json(
        { success: false, error: '缺少查询内容' },
        { status: 400 }
      )
    }

    // 使用 Promise.race 来控制超时
    const searchPromise = performMultiDatabaseSearch({
      query,
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
async function performMultiDatabaseSearch({ query }: { query: string }) {
  const startTime = Date.now()
  const databaseResults: any = {}
  let allResults: any[] = []
  let searchType = 'tokenize'

  // 并行搜索所有指定的数据库
  const searchPromises = ['back'].map(async (dbKey) => {
    try {
      const client = multiDB.getClient(dbKey as 'main' | 'back')
      const results = await searchSingleDatabase({ client, query })

      databaseResults[dbKey] = {
        success: true,
        ...(results || {}),
      }
      return results.results
    } catch (error: any) {
      console.error(`tokenize 分词失败:`, error.message)
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
    console.error('tokenize 分词执行失败:', error.message)
    throw error
  }

  const endTime = Date.now()
  const performance = {
    executionTime: endTime - startTime,
    searchType,
    totalResults: allResults.length,
  }

  return {
    results: allResults,
    searchType,
    message: `分词完成`,
    performance,
    databaseResults,
  }
}

// 单个数据库搜索函数
async function searchSingleDatabase({
  client,
  query,
}: {
  client: any
  query: string
}) {
  let fullTextSearchResults: any[] = []
  let searchType = 'tokenize'
  let textSearchSQL = ''

  try {
    console.log(`🔍 tokenize 分词...`)
    let searchResults: any[] = []
    // 备用数据库使用 hybrid_search 函数
    textSearchSQL = `
        SELECT tokenize('${query}', 'IK');
      `
    searchResults = await client.$queryRawUnsafe(textSearchSQL)

    fullTextSearchResults = searchResults
  } catch (textError: any) {
    console.error(`❌ 分词失败:`, textError?.message)
    throw new Error(`分词失败`)
  }

  return {
    results: fullTextSearchResults,
    searchType,
    sqlText: textSearchSQL,
  }
}
