import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 全局安全头 - 对所有请求生效
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // API 路由特殊处理
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // CORS 配置
    const origin = request.headers.get('origin')

    // 允许的域名列表（生产环境建议限制）
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
    ].filter(Boolean)

    // 检查是否允许该来源
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }

    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: response.headers,
      })
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*', // API 路由
    '/((?!_next/static|_next/image|favicon.ico).*)', // 排除 Next.js 内部文件
  ],
}
