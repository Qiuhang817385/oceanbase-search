import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 配置动态路由
export const dynamic = 'force-dynamic'

// POST /api/hybrid-search - 混合检索搜索
export async function POST(request: NextRequest) {
  try {
    const {
      query,
      vectorWeight = 0.7,
      keywordWeight = 0.3,
      limit = 10,
      year,
      genre,
      minRating = 0,
    } = await request.json()

    if (!query) {
      return NextResponse.json(
        { success: false, error: '缺少查询内容' },
        { status: 400 }
      )
    }

    // 1. 生成查询文本的向量嵌入
    const embeddingResponse = await fetch(
      `${process.env.BASE_URL}/embeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.EMBEDDING_MODEL || 'text-embedding-v4',
          input: query,
          dimensions: parseInt(process.env.DIMENSIONS || '1536'),
        }),
      }
    )

    if (!embeddingResponse.ok) {
      throw new Error(`嵌入 API 调用失败: ${embeddingResponse.statusText}`)
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // 2. 构建基础过滤条件
    const baseConditions = []
    const params = []

    if (year) {
      baseConditions.push('year = ?')
      params.push(year)
    }

    if (genre) {
      baseConditions.push('JSON_CONTAINS(genres, ?)')
      params.push(JSON.stringify(genre))
    }

    if (minRating > 0) {
      baseConditions.push('rating_score >= ?')
      params.push(minRating)
    }

    const whereClause =
      baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : ''

    // 3. 向量相似性搜索
    const vectorSearchSQL = `
      SELECT 
        id,
        title,
        original_title,
        year,
        genres,
        directors,
        actors,
        summary,
        rating_score,
        rating_count,
        images,
        component_code,
        movie_id,
        VECTOR_DISTANCE(embedding, JSON_ARRAY(${queryEmbedding
          .map(() => '?')
          .join(', ')})) as vector_distance,
        (1 - VECTOR_DISTANCE(embedding, JSON_ARRAY(${queryEmbedding
          .map(() => '?')
          .join(', ')}))) as vector_similarity
      FROM movie_corpus 
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY vector_distance ASC
      LIMIT ?
    `

    const vectorParams = [
      ...params,
      ...queryEmbedding,
      ...queryEmbedding,
      limit * 2,
    ] // 获取更多结果用于混合

    // 4. 关键词搜索
    const keywordSearchSQL = `
      SELECT 
        id,
        title,
        original_title,
        year,
        genres,
        directors,
        actors,
        summary,
        rating_score,
        rating_count,
        images,
        component_code,
        movie_id,
        (
          CASE 
            WHEN title LIKE ? THEN 3
            WHEN original_title LIKE ? THEN 2
            WHEN summary LIKE ? THEN 1
            ELSE 0
          END
        ) as keyword_score
      FROM movie_corpus 
      ${whereClause}
      AND (
        title LIKE ? OR 
        original_title LIKE ? OR 
        summary LIKE ?
      )
      ORDER BY keyword_score DESC, rating_score DESC
      LIMIT ?
    `

    const searchTerm = `%${query}%`
    const keywordParams = [
      ...params,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      limit * 2,
    ]

    // 5. 并行执行两种搜索
    const [vectorResults, keywordResults] = await Promise.all([
      prisma.$queryRawUnsafe(vectorSearchSQL, ...vectorParams),
      prisma.$queryRawUnsafe(keywordSearchSQL, ...keywordParams),
    ])

    // 6. 混合搜索结果
    const combinedResults = new Map()

    // 处理向量搜索结果
    vectorResults.forEach((item: any) => {
      const id = item.id
      const existing = combinedResults.get(id)

      if (existing) {
        existing.vectorSimilarity = item.vector_similarity
        existing.vectorDistance = item.vector_distance
      } else {
        combinedResults.set(id, {
          ...item,
          vectorSimilarity: item.vector_similarity,
          vectorDistance: item.vector_distance,
          keywordScore: 0,
          hybridScore: 0,
        })
      }
    })

    // 处理关键词搜索结果
    keywordResults.forEach((item: any) => {
      const id = item.id
      const existing = combinedResults.get(id)

      if (existing) {
        existing.keywordScore = item.keyword_score
      } else {
        combinedResults.set(id, {
          ...item,
          vectorSimilarity: 0,
          vectorDistance: 1,
          keywordScore: item.keyword_score,
          hybridScore: 0,
        })
      }
    })

    // 7. 计算混合分数并排序
    const finalResults = Array.from(combinedResults.values())
      .map((item) => {
        // 归一化分数 (0-1)
        const normalizedVectorScore = Math.max(0, item.vectorSimilarity || 0)
        const normalizedKeywordScore = Math.min(1, (item.keywordScore || 0) / 3)

        // 计算混合分数
        const hybridScore =
          normalizedVectorScore * vectorWeight +
          normalizedKeywordScore * keywordWeight

        return {
          ...item,
          hybridScore,
          searchType:
            item.vectorSimilarity > 0 && item.keywordScore > 0
              ? 'hybrid'
              : item.vectorSimilarity > 0
              ? 'vector'
              : 'keyword',
        }
      })
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: finalResults,
        total: finalResults.length,
        weights: {
          vector: vectorWeight,
          keyword: keywordWeight,
        },
        searchStats: {
          vectorResults: vectorResults.length,
          keywordResults: keywordResults.length,
          combinedResults: finalResults.length,
        },
      },
    })
  } catch (error) {
    console.error('混合检索失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '混合检索失败',
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
