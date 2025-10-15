import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initializeModel } from '@/middleware/model.js'

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

    const { model } = await initializeModel()

    if (!query) {
      return NextResponse.json(
        { success: false, error: '缺少查询内容' },
        { status: 400 }
      )
    }

    console.log('query', query)

    // 现在可以使用 req.model 进行嵌入生成
    const queryEmbedding = await model.embed(query)
    // 修复：正确格式化向量数组
    const vectorString = JSON.stringify(queryEmbedding)

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
    const getSQLQuery = `
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
                "query": "${query.replace(/"/g, '\\"')}", "boost": 0.5
              }
            },
            "knn": {
              "field": "embedding",
              "k": 10,
              "num_candidates": 50,
              "query_vector":  ${vectorString}
              }
        }'
      )
      LIMIT 5
    `

    const testFunctionQuery = `
      SELECT 
        ROUTINE_NAME, 
        ROUTINE_TYPE 
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_NAME LIKE '%hybrid%' 
         OR ROUTINE_NAME LIKE '%search%'
    `

    const simpleGetSQLQuery = `
    SELECT dbms_hybrid_search.get_sql('movie_corpus', '{"query": {"match_all": {}}}') as simple_sql
  `
    const simpleGetSQLQuery2 = `
    SELECT json_pretty(dbms_hybrid_search.search('movie_corpus', '{"query": {"match_all": {}}}')) as simple_sql
  `

    // 先测试简单的数据库连接
    // const testQuery = `
    //   SELECT COUNT(*) as total_count
    //   FROM movie_corpus
    //   LIMIT 1
    // `

    const vectorSearchSQL = `
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
        VECTOR_DISTANCE(embedding, JSON_ARRAY(${queryEmbedding.join(
          ','
        )})) as distance
      FROM movie_corpus 
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    const testQueries = [
      {
        name: 'embedding_field',
        sql: `
          SELECT 
            id, title, summary, year, genres,
            VECTOR_DISTANCE(embedding, JSON_ARRAY(${queryEmbedding.join(
              ','
            )})) as distance
          FROM movie_corpus 
          WHERE embedding IS NOT NULL
          ORDER BY distance ASC
          LIMIT ${limit}
        `,
      },
      {
        name: 'summary_embedding_field',
        sql: `
          SELECT 
            id, title, summary, year, genres, images,
            VECTOR_DISTANCE(
              JSON_EXTRACT(summary_embedding, '$'), 
              JSON_ARRAY(${queryEmbedding.join(',')})
            ) as distance
          FROM movie_corpus 
          WHERE summary_embedding IS NOT NULL 
            AND summary_embedding != ''
          ORDER BY distance ASC
          LIMIT ${limit}
        `,
      },
      {
        name: 'simple_embedding_check',
        sql: `
          SELECT 
            id, title, summary, year, genres
          FROM movie_corpus 
          WHERE embedding IS NOT NULL
          LIMIT ${limit}
        `,
      },
    ]
    const results = {}

    for (const testQuery of testQueries) {
      try {
        console.log(`Testing ${testQuery.name}...`)
        const result = await prisma.$queryRawUnsafe(testQuery.sql)
        results[testQuery.name] = {
          success: true,
          data: result,
          count: Array.isArray(result) ? result.length : 0,
        }
        console.log(`${testQuery.name} succeeded!`)
      } catch (error) {
        results[testQuery.name] = {
          success: false,
          error: error.message,
        }
        console.log(`${testQuery.name} failed:`, error.message)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        results,
        total: Array.isArray(results) ? results.length : 0,
        searchType: 'vector_similarity',
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
