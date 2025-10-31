import { NextRequest, NextResponse } from 'next/server'

// 配置动态路由
export const dynamic = 'force-dynamic'

// 初始化 nodejieba（可选：加载自定义词典）
// nodejieba.load({
//   userDict: './path/to/userdict.utf8',
// })

// POST /api/segment - 中文分词接口
export async function POST(request: NextRequest) {
  try {
    // 动态导入 nodejieba（只在服务端运行时加载）
    const nodejieba = (await import('nodejieba')).default
    // 安全解析 JSON
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type 必须是 application/json' },
        { status: 400 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError: any) {
      return NextResponse.json(
        { success: false, error: '无法解析 JSON', details: jsonError.message },
        { status: 400 }
      )
    }

    const { text, mode = 'cut' } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: '缺少 text 参数或格式不正确' },
        { status: 400 }
      )
    }

    // 根据模式选择分词方法
    let result: string[]
    switch (mode) {
      case 'cut':
        // 默认分词
        result = nodejieba.cut(text)
        break
      case 'cutHMM':
        // HMM 模型分词
        result = nodejieba.cutHMM(text)
        break
      case 'cutAll':
        // 全模式分词
        result = nodejieba.cutAll(text)
        break
      case 'cutForSearch':
        // 搜索引擎模式分词（推荐用于搜索场景）
        result = nodejieba.cutForSearch(text)
        break
      case 'cutSmall':
        // 小粒度分词
        const size = body.size || 3
        result = nodejieba.cutSmall(text, size)
        break
      case 'tag':
        // 词性标注（返回对象数组）
        const tagged = nodejieba.tag(text)
        return NextResponse.json({
          success: true,
          data: {
            words: tagged.map((item: any) => item.word),
            tagged: tagged,
          },
        })
      default:
        result = nodejieba.cut(text)
    }

    return NextResponse.json({
      success: true,
      data: {
        words: result,
        originalText: text,
        mode,
      },
    })
  } catch (error: any) {
    console.error('分词失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '分词失败',
        details: error?.message || '未知错误',
      },
      { status: 500 }
    )
  }
}

// GET /api/segment - 获取分词服务状态
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '分词服务正常运行',
    supportedModes: [
      'cut',
      'cutHMM',
      'cutAll',
      'cutForSearch',
      'cutSmall',
      'tag',
    ],
  })
}
