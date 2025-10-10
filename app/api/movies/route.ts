import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/movies - 获取电影列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const year = searchParams.get('year')
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')

    // 构建查询条件
    const where: any = {}

    if (year) {
      where.year = parseInt(year)
    }

    if (genre) {
      where.genres = {
        path: '$',
        string_contains: genre,
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { originalTitle: { contains: search } },
        { summary: { contains: search } },
      ]
    }

    // 分页查询
    const [movies, total] = await Promise.all([
      prisma.movieCorpus.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
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
          ratingScore: true,
          ratingCount: true,
          images: true,
          componentCode: true,
          movieId: true,
        },
      }),
      prisma.movieCorpus.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        movies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
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
        movie.genres.forEach((genre: string) => {
          genreCount[genre] = (genreCount[genre] || 0) + 1
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
