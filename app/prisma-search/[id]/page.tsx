import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getMovieById } from '@/lib/movies'
import MovieDetailPage from './ui/MovieDetailPage'

interface PageProps {
  params: {
    id: string
  }
}

export default async function Page({ params }: PageProps) {
  const movie = await getMovieById(params.id)

  if (!movie) {
    notFound()
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MovieDetailPage movie={movie} />
    </Suspense>
  )
}
