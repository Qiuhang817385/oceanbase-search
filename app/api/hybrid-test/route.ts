import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initializeModel } from '@/middleware/model.js'

// 配置动态路由
export const dynamic = 'force-dynamic'

// POST /api/hybrid-search - 混合检索搜索
export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { success: false, error: '缺少查询内容' },
        { status: 400 }
      )
    }

    const { model } = await initializeModel()
    const queryEmbedding = await model.embed(query)

    // 根据 OceanBase 文档，使用原生 SQL 进行向量搜索
    // 方案1: 使用 embedding 字段 (VECTOR(1024) 类型)
    let vectorResults = []
    let searchType = 'text_search'

    try {
      // 截断或填充向量到 1024 维度以匹配数据库字段
      // const adjustedEmbedding = queryEmbedding.slice(0, 1024)
      // // 如果向量长度不足1024，用0填充
      // while (adjustedEmbedding.length < 1024) {
      //   adjustedEmbedding.push(0)
      // }

      const vectorSearchSQL = `
        SELECT 
          id, 
          title, 
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
          l2_distance(embedding, [${queryEmbedding.join(',')}]) as distance
        FROM movie_corpus 
        WHERE embedding IS NOT NULL
        ORDER BY distance ASC
        LIMIT ${limit}
      `

      console.log('Executing vector search with embedding field...')
      vectorResults = await prisma.$queryRawUnsafe(vectorSearchSQL)
      searchType = 'vector_search'
      console.log(
        'Vector search results count:',
        Array.isArray(vectorResults) ? vectorResults.length : 0
      )
    } catch (vectorError) {
      console.log(
        'Vector search failed, falling back to text search:',
        vectorError.message
      )

      // 方案2: 使用 summary_embedding 字段 (text 类型，JSON 格式)
      try {
        const summaryVectorSQL = `
          SELECT 
            id, 
            title, 
            summary, 
            year, 
            genres,
            directors,
            actors,
            rating_score,
            rating_count,
            l2_distance(JSON_EXTRACT(summary_embedding, '$'), [${queryEmbedding.join(
              ','
            )}]) as distance
          FROM movie_corpus 
          WHERE summary_embedding IS NOT NULL 
            AND summary_embedding != ''
          ORDER BY distance ASC
          LIMIT ${limit}
        `

        console.log('Executing vector search with summary_embedding field...')
        vectorResults = await prisma.$queryRawUnsafe(summaryVectorSQL)
        searchType = 'vector_search_summary'
        console.log(
          'Summary vector search results count:',
          Array.isArray(vectorResults) ? vectorResults.length : 0
        )
      } catch (summaryVectorError) {
        console.log(
          'Summary vector search also failed:',
          summaryVectorError.message
        )

        // 方案3: 回退到文本搜索
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
          },
          orderBy: {
            ratingScore: 'desc',
          },
        })

        vectorResults = searchResults
        searchType = 'text_search'
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: vectorResults,
        total: Array.isArray(vectorResults) ? vectorResults.length : 0,
        searchType,
        embeddingDimensions: queryEmbedding.length,
        message:
          searchType === 'text_search'
            ? '使用文本搜索，向量搜索遇到问题'
            : '向量搜索成功',
      },
    })
  } catch (error) {
    console.error('搜索失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '搜索失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// GET /api/hybrid-search - 获取混合检索配置
export async function GET() {
  return NextResponse.json({
    success: true,
    config: {
      embeddingProvider: process.env.EMBEDDING_PROVIDER,
      embeddingModel: process.env.EMBEDDING_MODEL,
      dimensions: process.env.DIMENSIONS,
      baseUrl: process.env.BASE_URL,
      defaultWeights: {
        vector: 0.7,
        keyword: 0.3,
      },
    },
  })
}
