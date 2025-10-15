// middleware.ts (项目根目录)
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // 为 API 路由添加 CORS 头
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()

    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    )

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
