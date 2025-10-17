import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initializeModel } from '@/middleware/model.js'

// 配置动态路由
export const dynamic = 'force-dynamic'

// 设置请求超时时间 (25秒，Vercel 限制是30秒)
const REQUEST_TIMEOUT = 25000

// POST /api/vector-search - 优化的向量搜索
export async function POST(request: NextRequest) {
  // 设置超时控制
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求超时')), REQUEST_TIMEOUT)
  })

  try {
    const { query, limit = 10 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { success: false, error: '缺少查询内容' },
        { status: 400 }
      )
    }

    // 限制查询数量，避免过大查询
    const safeLimit = Math.min(limit, 20)

    const { model } = await initializeModel()
    const queryEmbedding = await model.embed(query)

    // 使用 Promise.race 来控制超时
    const searchPromise = performVectorSearch(queryEmbedding, safeLimit, query)
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

// 优化的向量搜索函数
async function performVectorSearch(
  queryEmbedding: number[],
  limit: number,
  query: string
) {
  const startTime = Date.now()
  let vectorResults: any[] = []
  let searchType = 'text_search'

  try {
    // 方案1: 使用 embedding 字段进行向量搜索
    console.log('🔍 尝试使用 embedding 字段进行向量搜索...')

    const vectorSearchSQL = `
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
      FROM movie_corpus 
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ?
    `

    vectorResults = (await prisma.$queryRawUnsafe(
      vectorSearchSQL,
      ...queryEmbedding,
      limit
    )) as any[]
    searchType = 'vector_search'

    console.log(`✅ 向量搜索成功，找到 ${vectorResults.length} 条结果`)
  } catch (vectorError: any) {
    console.log('❌ embedding 字段向量搜索失败:', vectorError?.message)

    try {
      // 方案2: 使用 summary_embedding 字段进行向量搜索
      console.log('🔍 尝试使用 summary_embedding 字段进行向量搜索...')

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
        FROM movie_corpus 
        WHERE summary_embedding IS NOT NULL 
          AND summary_embedding != ''
          AND JSON_VALID(summary_embedding) = 1
        ORDER BY distance ASC
        LIMIT ?
      `

      vectorResults = (await prisma.$queryRawUnsafe(
        summaryVectorSQL,
        ...queryEmbedding,
        limit
      )) as any[]
      searchType = 'vector_search_summary'

      console.log(
        `✅ summary_embedding 向量搜索成功，找到 ${vectorResults.length} 条结果`
      )
    } catch (summaryVectorError: any) {
      console.log(
        '❌ summary_embedding 字段向量搜索也失败:',
        summaryVectorError?.message
      )

      try {
        // 方案3: 回退到优化的文本搜索
        console.log('🔍 回退到文本搜索...')

        const searchResults = await prisma.movieCorpus.findMany({
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

        vectorResults = searchResults
        searchType = 'text_search'

        console.log(`✅ 文本搜索成功，找到 ${vectorResults.length} 条结果`)
      } catch (textError: any) {
        console.error('❌ 文本搜索也失败:', textError?.message)
        throw new Error('所有搜索方案都失败了')
      }
    }
  }

  const endTime = Date.now()
  const performance = {
    executionTime: endTime - startTime,
    searchType,
    embeddingDimensions: queryEmbedding.length,
  }

  return {
    results: vectorResults,
    searchType,
    message: getSearchMessage(searchType),
    performance,
  }
}

// 获取搜索消息
function getSearchMessage(searchType: string): string {
  switch (searchType) {
    case 'vector_search':
      return '使用 embedding 字段进行向量搜索成功'
    case 'vector_search_summary':
      return '使用 summary_embedding 字段进行向量搜索成功'
    case 'text_search':
      return '向量搜索遇到问题，使用文本搜索'
    default:
      return '搜索完成'
  }
}

// GET /api/vector-search - 获取向量搜索配置
export async function GET() {
  try {
    // 检查数据库连接和表结构
    const tableInfo = await prisma.$queryRaw`
      SELECT COUNT(*) as total_records FROM movie_corpus
    `

    const embeddingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as embedding_count FROM movie_corpus WHERE embedding IS NOT NULL
    `

    const summaryEmbeddingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as summary_embedding_count FROM movie_corpus 
      WHERE summary_embedding IS NOT NULL AND summary_embedding != ''
    `

    return NextResponse.json({
      success: true,
      config: {
        embeddingProvider: process.env.EMBEDDING_PROVIDER,
        embeddingModel: process.env.EMBEDDING_MODEL,
        dimensions: process.env.DIMENSIONS,
        baseUrl: process.env.BASE_URL,
        database: {
          totalRecords: tableInfo[0].total_records,
          embeddingRecords: embeddingCount[0].embedding_count,
          summaryEmbeddingRecords:
            summaryEmbeddingCount[0].summary_embedding_count,
        },
        timeout: REQUEST_TIMEOUT,
      },
    })
  } catch (error: any) {
    console.error('获取配置失败:', error)
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
