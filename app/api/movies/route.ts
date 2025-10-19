import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 配置动态路由
export const dynamic = 'force-dynamic'

// GET /api/movies - 获取电影列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 调试信息
    console.log('API 请求 URL:', request.url)
    console.log('API searchParams:', Object.fromEntries(searchParams.entries()))

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const year = searchParams.get('year')
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')

    // 处理 filters 参数
    let filters = {}
    const filtersParam = searchParams.get('filters')
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam)
        console.log('解析后的 filters:', filters)
      } catch (error) {
        console.error('解析 filters 失败:', error)
      }
    }

    // 合并参数
    const finalPage = filters.page || page
    const finalLimit = limit
    const finalYear = filters.year || year
    const finalGenre = filters.genre || genre
    const finalSearch = filters.search || search

    console.log('最终参数:', {
      finalPage,
      finalLimit,
      finalYear,
      finalGenre,
      finalSearch,
    })

    // 构建查询条件
    const where: any = {}

    if (finalYear) {
      where.year = parseInt(finalYear)
    }

    if (finalGenre) {
      where.genres = {
        path: '$',
        string_contains: finalGenre,
      }
    }

    if (finalSearch) {
      where.OR = [
        { title: { contains: finalSearch } },
        { originalTitle: { contains: finalSearch } },
        { summary: { contains: finalSearch } },
      ]
    }

    // 分页查询
    const [movies, total] = await Promise.all([
      prisma.movieCorpus.findMany({
        where,
        skip: (finalPage - 1) * finalLimit,
        take: finalLimit,
        orderBy: {
          ratingScore: 'desc',
        },
        select: {
          id: true,
          title: true,
          originalTitle: true,
          year: true,
          genres: true,
          countries: true,
          languages: true,
          directors: true,
          actors: true,
          summary: true,
          // 此处需要添加summaryEmbedding用于向量查询
          summaryEmbedding: true,
          ratingScore: true,
          ratingCount: true,
          images: true,
          componentCode: true,
          movieId: true,
        },
      }),
      prisma.movieCorpus.count({ where }),
    ])

    console.log('查询结果:', { moviesCount: movies.length, total })

    return NextResponse.json({
      success: true,
      data: {
        movies,
        pagination: {
          page: finalPage,
          limit: finalLimit,
          total,
          totalPages: Math.ceil(total / finalLimit),
        },
      },
    })
  } catch (error) {
    console.error('获取电影列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取电影列表失败' },
      { status: 500 }
    )
  }
}

// GET /api/movies/stats - 获取电影统计信息
export async function POST() {
  try {
    const [totalMovies, yearStats, genreStats] = await Promise.all([
      // 总电影数
      prisma.movieCorpus.count(),

      // 年份统计
      prisma.movieCorpus.groupBy({
        by: ['year'],
        _count: { year: true },
        where: { year: { not: null } },
        orderBy: { year: 'desc' },
        take: 10,
      }),

      // 类型统计（需要特殊处理，因为 genres 是 JSON 字段）
      prisma.movieCorpus.findMany({
        select: { genres: true },
        take: 1000, // 限制数量以提高性能
      }),
    ])

    // 处理类型统计
    const genreCount: Record<string, number> = {}
    genreStats.forEach((movie) => {
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach((genre) => {
          if (typeof genre === 'string') {
            genreCount[genre] = (genreCount[genre] || 0) + 1
          }
        })
      }
    })

    const topGenres = Object.entries(genreCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([genre, count]) => ({ genre, count }))

    return NextResponse.json({
      success: true,
      data: {
        totalMovies,
        yearStats: yearStats.map((stat) => ({
          year: stat.year,
          count: stat._count.year,
        })),
        topGenres,
      },
    })
  } catch (error) {
    console.error('获取电影统计失败:', error)
    return NextResponse.json(
      { success: false, error: '获取电影统计失败' },
      { status: 500 }
    )
  }
}
