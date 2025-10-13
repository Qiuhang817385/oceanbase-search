/**
 * 构建搜索参数字符串
 * @param initialQuery - 初始查询参数（来自 SSR）
 * @param clientFilters - 客户端过滤器状态
 * @returns 合并后的搜索参数字符串
 */
export function buildSearchParams(
  initialQuery: Record<string, string | undefined>,
  clientFilters: Record<string, any>
): string {
  const params = new URLSearchParams()

  // 添加初始查询参数
  Object.entries(initialQuery).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value)
    }
  })

  // 添加客户端过滤器参数
  Object.entries(clientFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object') {
        params.set(key, JSON.stringify(value))
      } else {
        params.set(key, String(value))
      }
    }
  })

  return params.toString()
}

/**
 * 解析搜索参数
 * @param searchParams - URL 搜索参数
 * @returns 解析后的参数对象
 */
export function parseSearchParams(searchParams: URLSearchParams) {
  const result: Record<string, any> = {}

  for (const [key, value] of searchParams.entries()) {
    try {
      // 尝试解析 JSON
      result[key] = JSON.parse(value)
    } catch {
      // 如果不是 JSON，直接使用字符串值
      result[key] = value
    }
  }

  return result
}
