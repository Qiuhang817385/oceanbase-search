import { Suspense } from 'react'
import MovieSearchPage from './ui/MovieSearchPage'
export default async function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <>
        <MovieSearchPage />
      </>
    </Suspense>
  )
}
