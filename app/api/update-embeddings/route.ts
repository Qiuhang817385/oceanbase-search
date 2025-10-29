import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DATABASE_TABLES } from '@/constants'

// 配置动态路由
export const dynamic = 'force-dynamic'

// POST /api/update-embeddings - 批量更新电影向量嵌入
export async function POST(request: NextRequest) {
  try {
    const {
      batchSize = 10,
      startId = null,
      updateSummary = true,
      updateDocument = true,
    } = await request.json()

    // 获取需要更新的电影数据
    const movies = await prisma.movieCorpus.findMany({
      where: {
        ...(startId && { id: { gte: startId } }),
        ...(updateSummary && { summary: { not: null } }),
        ...(updateDocument && { document: { not: null } }),
      },
      select: {
        id: true,
        title: true,
        summary: true,
        document: true,
        componentCode: true,
      },
      take: batchSize,
      orderBy: { id: 'asc' },
    })

    if (movies.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要更新的数据',
        processed: 0,
      })
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    // 批量处理电影数据
    for (const movie of movies) {
      try {
        // 构建用于生成嵌入的文本
        const textForEmbedding = [movie.title, movie.summary, movie.document]
          .filter(Boolean)
          .join(' ')

        if (!textForEmbedding.trim()) {
          console.warn(`电影 ${movie.id} 没有可用的文本内容`)
          continue
        }

        // 生成向量嵌入
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
              input: textForEmbedding,
              dimensions: parseInt(process.env.DIMENSIONS || '1536'),
            }),
          }
        )

        if (!embeddingResponse.ok) {
          throw new Error(`嵌入 API 调用失败: ${embeddingResponse.statusText}`)
        }

        const embeddingData = await embeddingResponse.json()
        const embedding = embeddingData.data[0].embedding

        // 更新数据库中的向量数据
        await prisma.$executeRawUnsafe(
          `UPDATE ${DATABASE_TABLES.MOVIE_CORPUS} 
           SET embedding = JSON_ARRAY(${embedding.map(() => '?').join(', ')}),
               summary_embedding = ?
           WHERE id = ? AND component_code = ?`,
          ...embedding,
          JSON.stringify(embedding),
          movie.id,
          movie.componentCode
        )

        results.push({
          id: movie.id,
          title: movie.title,
          status: 'success',
          embeddingDimensions: embedding.length,
        })

        successCount++

        // 添加延迟避免 API 限制
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`更新电影 ${movie.id} 嵌入失败:`, error)
        results.push({
          id: movie.id,
          title: movie.title,
          status: 'error',
          error: error instanceof Error ? error.message : '未知错误',
        })
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: movies.length,
        success: successCount,
        errors: errorCount,
        results,
        nextBatch:
          movies.length === batchSize ? movies[movies.length - 1].id : null,
      },
    })
  } catch (error) {
    console.error('批量更新嵌入失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '批量更新嵌入失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// GET /api/update-embeddings - 获取更新状态
export async function GET() {
  try {
    // 统计向量数据情况
    const stats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*) as total_movies,
        COUNT(embedding) as movies_with_embedding,
        COUNT(summary_embedding) as movies_with_summary_embedding
      FROM ${DATABASE_TABLES.MOVIE_CORPUS}
    `)

    return NextResponse.json({
      success: true,
      stats: stats[0],
      config: {
        embeddingModel: process.env.EMBEDDING_MODEL,
        dimensions: process.env.DIMENSIONS,
        baseUrl: process.env.BASE_URL,
      },
    })
  } catch (error) {
    console.error('获取更新状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取更新状态失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
