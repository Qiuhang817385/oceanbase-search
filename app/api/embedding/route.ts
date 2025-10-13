import { NextRequest, NextResponse } from 'next/server'

// 配置动态路由
export const dynamic = 'force-dynamic'

// POST /api/embedding - 生成文本的向量嵌入
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json(
        { success: false, error: '缺少文本内容' },
        { status: 400 }
      )
    }

    // 调用阿里云 DashScope API 生成嵌入向量
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
          input: text,
          dimensions: parseInt(process.env.DIMENSIONS || '1536'),
        }),
      }
    )

    if (!embeddingResponse.ok) {
      throw new Error(`嵌入 API 调用失败: ${embeddingResponse.statusText}`)
    }

    const embeddingData = await embeddingResponse.json()
    const embedding = embeddingData.data[0].embedding

    return NextResponse.json({
      success: true,
      data: {
        text,
        embedding,
        dimensions: embedding.length,
        model: process.env.EMBEDDING_MODEL,
      },
    })
  } catch (error) {
    console.error('生成嵌入向量失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '生成嵌入向量失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// GET /api/embedding - 获取配置信息
export async function GET() {
  return NextResponse.json({
    success: true,
    config: {
      provider: process.env.EMBEDDING_PROVIDER,
      model: process.env.EMBEDDING_MODEL,
      dimensions: process.env.DIMENSIONS,
      baseUrl: process.env.BASE_URL,
    },
  })
}
