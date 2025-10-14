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
  // 处理 ReactPromise 的辅助函数
  async function resolveSearchParams(params: any) {
    // 检查是否是 ReactPromise
    if (params && typeof params === 'object' && 'status' in params) {
      console.log('检测到 ReactPromise:')
      console.log('- 类型:', typeof params)
      console.log('- 状态:', params.status)
      console.log('- 是否有 then 方法:', typeof params.then === 'function')
      console.log('- 是否有 catch 方法:', typeof params.catch === 'function')

      try {
        // 等待 Promise 解析
        const resolved = await params
        console.log('ReactPromise 解析成功:', resolved)
        return resolved || {}
      } catch (error) {
        console.error('ReactPromise 解析失败:', error)
        return {}
      }
    }
    // 如果不是 Promise，直接返回
    return params || {}
  }

  // 解析 searchParams
  const resolvedParams = await resolveSearchParams(searchParams)

  // 解析 filters JSON 字符串
  let filters: {
    page?: string
    year?: string
    genre?: string
    search?: string
  } = {}
  if (resolvedParams.filters) {
    try {
      filters = JSON.parse(resolvedParams.filters)
    } catch (error) {
      console.error('解析 filters 失败:', error)
    }
  }

  // 合并参数：filters 中的参数优先级更高
  const finalParams = {
    page: filters.page || resolvedParams.page || '1',
    limit: resolvedParams.limit || '10',
    year: filters.year || resolvedParams.year,
    genre: filters.genre || resolvedParams.genre,
    search: filters.search || resolvedParams.search,
  }

  const page = parseInt(finalParams.page)
  const limit = parseInt(finalParams.limit)

  // 在页面级别获取初始数据（SSR）
  const initialData = await getMovies(
    page,
    limit,
    finalParams.year,
    finalParams.genre,
    finalParams.search
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MovieSearchPage initialData={initialData} initialQuery={finalParams} />
    </Suspense>
  )
}
