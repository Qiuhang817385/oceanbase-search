import { prisma } from './prisma'

export interface MovieData {
  id: string
  title: string
  originalTitle: string | null
  year: number | null
  genres: any
  countries: any
  languages: any
  directors: any
  actors: any
  summary: string | null
  ratingScore: number | null
  ratingCount: number | null
  images: any
  componentCode: number
  movieId: number
}

export interface MoviesResponse {
  movies: MovieData[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getMovies(
  page: number = 1,
  limit: number = 10,
  year?: string,
  genre?: string,
  search?: string
): Promise<MoviesResponse> {
  try {
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

    return {
      movies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('获取电影列表失败:', error)
    throw new Error('获取电影列表失败')
  }
}

export async function getMovieById(id: string): Promise<MovieData | null> {
  try {
    const movie = await prisma.movieCorpus.findUnique({
      where: { id },
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
    })

    return movie
  } catch (error) {
    console.error('获取电影详情失败:', error)
    throw new Error('获取电影详情失败')
  }
}
