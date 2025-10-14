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
    // const embeddingResponse = await fetch(
    //   `${process.env.BASE_URL}/embeddings`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    //     },
    //     body: JSON.stringify({
    //       model: process.env.EMBEDDING_MODEL || 'text-embedding-v4',
    //       input: query,
    //       dimensions: parseInt(process.env.DIMENSIONS || '1536'),
    //     }),
    //   }
    // )

    // if (!embeddingResponse.ok) {
    //   throw new Error(`嵌入 API 调用失败: ${embeddingResponse.statusText}`)
    // }

    // const embeddingData = await embeddingResponse.json()
    // const queryEmbedding = embeddingData.data[0].embedding

    // console.log('queryEmbedding', queryEmbedding)

    // 4. 关键词搜索
    const keywordSearchSQL = `
      SELECT dbms_hybrid_search.get_sql('movie_corpus',  
      '{
        "query": 
          {
            "query_string": 
            {
              "fields": 
                [
                  "directors^3", 
                  "actors^2.5", 
                  "tags^2", 
                  "genres^1.5", 
                  "summary"
                ], 
                "query": "2000年之前的战争片", "boost": 0.5
              }
            }, 
            "knn": {
              "field": "embedding", 
              "k": 10, 
              "num_candidates": 50, 
              "query_vector": []
              }
        }'
      )
      LIMIT 5
    `

    return

    // 5. 并行执行两种搜索
    const [keywordResults] = await Promise.all([
      prisma.$queryRawUnsafe(keywordSearchSQL),
    ])

    // 6. 混合搜索结果
    const combinedResults = new Map()

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
          vectorResults: [].length,
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
