'use client'

import useSWR from 'swr'
import { useSyncURLState } from './useSyncURLState'
import { buildSearchParams } from '@/lib/utils/searchParams'
import { MovieData } from '@/lib/movies'

interface MovieSearchFilters {
  year?: string
  genre?: string
  search?: string
  page?: number
  limit?: number
}

interface MovieSearchResult {
  movies: MovieData[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseMovieSearchProps {
  initialData: MovieSearchResult
  initialQuery: Record<string, string | undefined>
}

/**
 * 自定义 hook 管理电影搜索状态
 * 结合 SSR 初始数据和客户端 URL 状态管理
 */
export function useMovieSearch({
  initialData,
  initialQuery,
}: UseMovieSearchProps) {
  // 使用 URL 同步状态管理过滤器
  const [filters, setFilters] = useSyncURLState<MovieSearchFilters>(
    'filters',
    {}
  )

  // 构建搜索参数
  const searchParams = buildSearchParams(initialQuery, filters)

  // 使用 SWR 进行数据获取
  const { data, error, isLoading, mutate } = useSWR(
    `/api/movies?${searchParams}`,
    {
      fallbackData: initialData,
      refreshInterval: 0, // 不自动刷新，由用户操作触发
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // 更新过滤器的便捷方法
  const updateFilters = (newFilters: Partial<MovieSearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  // 重置过滤器
  const resetFilters = () => {
    setFilters({})
  }

  // 分页方法
  const goToPage = (page: number) => {
    updateFilters({ page })
  }

  const changePageSize = (limit: number) => {
    updateFilters({ page: 1, limit }) // 改变页面大小时重置到第一页
  }

  return {
    // 数据
    movies: data?.movies || [],
    pagination: data?.pagination || initialData.pagination,

    // 状态
    filters,
    isLoading: isLoading && !data,
    error,

    // 方法
    setFilters,
    updateFilters,
    resetFilters,
    goToPage,
    changePageSize,

    // SWR 方法
    mutate,
  }
}
