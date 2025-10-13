import { Suspense } from 'react'
import MovieSearchPage from './ui/MovieSearchPage'
import { getMovies } from '@/lib/movies'

interface PageProps {
  searchParams: {
    page?: string
    limit?: string
    year?: string
    genre?: string
    search?: string
  }
}

export default async function Page({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || '1')
  const limit = parseInt(searchParams.limit || '10')

  console.log('searchParams', searchParams)

  // 在页面级别获取初始数据（SSR）
  const initialData = await getMovies(
    page,
    limit,
    searchParams.year,
    searchParams.genre,
    searchParams.search
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MovieSearchPage initialData={initialData} initialQuery={searchParams} />
    </Suspense>
  )
}
