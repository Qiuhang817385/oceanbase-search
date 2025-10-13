import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 配置动态路由
export const dynamic = 'force-dynamic'

// GET /api/test_movies - 演示 Prisma 原生 SQL 查询
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryType = searchParams.get('type') || 'basic'

    let result: any = {}

    switch (queryType) {
      case 'basic':
        // 示例1: 基础原生 SQL 查询
        result = await prisma.$queryRaw`
          SELECT 
            id, 
            title, 
            year, 
            rating_score,
            rating_count
          FROM movie_corpus 
          WHERE year >= 2020 
          ORDER BY rating_score DESC 
          LIMIT 10
        `
        break

      case 'aggregate':
        // 示例2: 聚合查询
        result = await prisma.$queryRaw`
          SELECT 
            year,
            COUNT(*) as movie_count,
            AVG(rating_score) as avg_rating,
            MAX(rating_score) as max_rating,
            MIN(rating_score) as min_rating
          FROM movie_corpus 
          WHERE year IS NOT NULL 
            AND rating_score IS NOT NULL
          GROUP BY year 
          HAVING movie_count > 5
          ORDER BY year DESC 
          LIMIT 15
        `
        break

      case 'json':
        // 示例3: JSON 字段查询 (MySQL 5.7+)
        result = await prisma.$queryRaw`
          SELECT 
            id,
            title,
            year,
            JSON_EXTRACT(genres, '$[0]') as first_genre,
            JSON_LENGTH(genres) as genre_count,
            JSON_EXTRACT(actors, '$[0]') as first_actor
          FROM movie_corpus 
          WHERE JSON_CONTAINS(genres, '"动作"')
            AND year >= 2015
          ORDER BY rating_score DESC 
          LIMIT 10
        `
        break

      case 'complex':
        // 示例4: 复杂查询 - 查找高评分电影的导演统计
        result = await prisma.$queryRaw`
          SELECT 
            JSON_UNQUOTE(JSON_EXTRACT(directors, '$[0]')) as director,
            COUNT(*) as movie_count,
            AVG(rating_score) as avg_rating,
            MAX(rating_score) as best_rating
          FROM movie_corpus 
          WHERE rating_score >= 8.0 
            AND directors IS NOT NULL
            AND JSON_LENGTH(directors) > 0
          GROUP BY JSON_UNQUOTE(JSON_EXTRACT(directors, '$[0]'))
          HAVING movie_count >= 2
          ORDER BY avg_rating DESC, movie_count DESC
          LIMIT 20
        `
        break

      case 'search':
        // 示例5: 全文搜索查询
        const searchTerm = searchParams.get('search') || '复仇者'
        result = await prisma.$queryRaw`
          SELECT 
            id,
            title,
            original_title,
            year,
            rating_score,
            summary
          FROM movie_corpus 
          WHERE title LIKE ${`%${searchTerm}%`}
             OR original_title LIKE ${`%${searchTerm}%`}
             OR summary LIKE ${`%${searchTerm}%`}
          ORDER BY rating_score DESC 
          LIMIT 15
        `
        break

      case 'pagination':
        // 示例6: 分页查询
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const offset = (page - 1) * limit

        const [movies, totalCount] = await Promise.all([
          prisma.$queryRaw`
            SELECT 
              id,
              title,
              year,
              rating_score,
              rating_count,
              JSON_EXTRACT(genres, '$[0]') as primary_genre
            FROM movie_corpus 
            WHERE year IS NOT NULL
            ORDER BY rating_score DESC 
            LIMIT ${limit} OFFSET ${offset}
          `,
          prisma.$queryRaw`
            SELECT COUNT(*) as total FROM movie_corpus WHERE year IS NOT NULL
          `,
        ])

        result = {
          movies,
          pagination: {
            page,
            limit,
            total: (totalCount as any)[0].total,
            totalPages: Math.ceil((totalCount as any)[0].total / limit),
          },
        }
        break

      case 'stats':
        // 示例7: 统计查询
        const [totalStats, yearStats, genreStats] = await Promise.all([
          prisma.$queryRaw`
            SELECT 
              COUNT(*) as total_movies,
              AVG(rating_score) as avg_rating,
              MAX(rating_score) as max_rating,
              MIN(rating_score) as min_rating,
              COUNT(CASE WHEN year >= 2020 THEN 1 END) as recent_movies
            FROM movie_corpus 
            WHERE rating_score IS NOT NULL
          `,
          prisma.$queryRaw`
            SELECT 
              year,
              COUNT(*) as count,
              AVG(rating_score) as avg_rating
            FROM movie_corpus 
            WHERE year IS NOT NULL 
              AND year >= 2010
            GROUP BY year 
            ORDER BY year DESC 
            LIMIT 10
          `,
          prisma.$queryRaw`
            SELECT 
              JSON_UNQUOTE(JSON_EXTRACT(genres, '$[0]')) as genre,
              COUNT(*) as count,
              AVG(rating_score) as avg_rating
            FROM movie_corpus 
            WHERE genres IS NOT NULL 
              AND JSON_LENGTH(genres) > 0
              AND rating_score IS NOT NULL
            GROUP BY JSON_UNQUOTE(JSON_EXTRACT(genres, '$[0]'))
            HAVING count >= 10
            ORDER BY avg_rating DESC 
            LIMIT 15
          `,
        ])

        result = {
          totalStats: (totalStats as any)[0],
          yearStats,
          genreStats,
        }
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: '无效的查询类型',
            availableTypes: [
              'basic',
              'aggregate',
              'json',
              'complex',
              'search',
              'pagination',
              'stats',
            ],
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      queryType,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('原生 SQL 查询失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '原生 SQL 查询失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// POST /api/test_movies - 演示 Prisma 原生 SQL 执行
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sql, params = [] } = body

    if (!sql) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少 SQL 查询语句',
        },
        { status: 400 }
      )
    }

    // 使用 $executeRaw 执行原生 SQL (INSERT, UPDATE, DELETE)
    // 使用 $queryRaw 执行查询 SQL (SELECT)
    const isQuery = sql.trim().toUpperCase().startsWith('SELECT')

    let result
    if (isQuery) {
      // 查询操作
      if (params.length > 0) {
        result = await prisma.$queryRawUnsafe(sql, ...params)
      } else {
        result = await prisma.$queryRawUnsafe(sql)
      }
    } else {
      // 执行操作 (INSERT, UPDATE, DELETE)
      if (params.length > 0) {
        result = await prisma.$executeRawUnsafe(sql, ...params)
      } else {
        result = await prisma.$executeRawUnsafe(sql)
      }
    }

    return NextResponse.json({
      success: true,
      sql,
      params,
      isQuery,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('原生 SQL 执行失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '原生 SQL 执行失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
