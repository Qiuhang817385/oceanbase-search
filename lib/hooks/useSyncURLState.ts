'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

/**
 * 自定义 hook 用于同步 URL 状态
 * @param key - URL 参数的键名
 * @param defaultValue - 默认值
 * @returns [value, setValue] - 状态值和设置函数
 */
export function useSyncURLState<T>(key: string, defaultValue: T) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 从 URL 中获取当前值
  const value = useMemo(() => {
    const param = searchParams.get(key)
    if (param === null) return defaultValue

    try {
      return JSON.parse(param)
    } catch {
      return param as T
    }
  }, [searchParams, key, defaultValue])

  // 设置值的函数
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const params = new URLSearchParams(searchParams.toString())

      const finalValue =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(value)
          : newValue

      if (
        finalValue === defaultValue ||
        finalValue === null ||
        finalValue === undefined
      ) {
        params.delete(key)
      } else {
        params.set(
          key,
          typeof finalValue === 'string'
            ? finalValue
            : JSON.stringify(finalValue)
        )
      }

      // 重置页码到第一页（除非是在设置页码本身）
      if (key !== 'page') {
        params.delete('page')
      }

      router.push(`?${params.toString()}`)
    },
    [router, searchParams, key, value, defaultValue]
  )

  return [value, setValue] as const
}
