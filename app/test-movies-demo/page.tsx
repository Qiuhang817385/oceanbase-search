'use client'

import { useState } from 'react'

export default function TestMoviesDemo() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customSql, setCustomSql] = useState(
    'SELECT * FROM movie_corpus WHERE year >= 2020 LIMIT 5'
  )
  const [customParams, setCustomParams] = useState('')

  const queryTypes = [
    { value: 'basic', label: '基础查询 - 2020 年后高评分电影' },
    { value: 'aggregate', label: '聚合查询 - 按年份统计' },
    { value: 'json', label: 'JSON查询 - 动作类型电影' },
    { value: 'complex', label: '复杂查询 - 导演统计' },
    { value: 'search', label: '搜索查询 - 复仇者相关电影' },
    { value: 'pagination', label: '分页查询 - 分页电影列表' },
    { value: 'stats', label: '统计查询 - 数据库统计信息' },
  ]

  const executeQuery = async (type: string, searchTerm?: string) => {
    setLoading(true)
    setError(null)

    try {
      let url = `/api/test_movies?type=${type}`
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || '查询失败')
      }
    } catch (err) {
      setError('网络错误: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const executeCustomSql = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = customParams
        ? customParams.split(',').map((p) => p.trim())
        : []

      const response = await fetch('/api/test_movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: customSql,
          params: params,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'SQL 执行失败')
      }
    } catch (err) {
      setError('网络错误: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Prisma 原生 SQL 查询演示</h1>

      {/* 预定义查询类型 */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">预定义查询类型</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {queryTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => executeQuery(type.value)}
              disabled={loading}
              className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
            >
              <div className="font-medium">{type.label}</div>
              <div className="text-sm text-gray-500">类型: {type.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 自定义 SQL 查询 */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">自定义 SQL 查询</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              SQL 查询语句:
            </label>
            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              className="w-full p-3 border rounded-lg font-mono text-sm"
              rows={4}
              placeholder="输入 SQL 查询语句..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              参数 (用逗号分隔):
            </label>
            <input
              type="text"
              value={customParams}
              onChange={(e) => setCustomParams(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="例如: 2020, 8.0"
            />
          </div>
          <button
            onClick={executeCustomSql}
            disabled={loading || !customSql.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '执行中...' : '执行 SQL'}
          </button>
        </div>
      </div>

      {/* 结果展示 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">查询中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-medium">错误</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {result && !loading && (
        <div className="bg-gray-50 border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">查询结果</h2>

          <div className="mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">查询类型:</span>{' '}
                {result.queryType || '自定义'}
              </div>
              <div>
                <span className="font-medium">执行时间:</span>{' '}
                {result.timestamp}
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-2">数据:</h3>
            <pre className="text-sm overflow-auto max-h-96 bg-gray-100 p-3 rounded">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">使用说明</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>预定义查询:</strong> 点击上方按钮执行不同类型的预定义查询
          </p>
          <p>
            <strong>自定义查询:</strong> 在文本框中输入 SQL 语句，支持参数化查询
          </p>
          <p>
            <strong>参数格式:</strong> 用逗号分隔参数值，例如: "2020, 8.0"
          </p>
          <p>
            <strong>表名:</strong> 使用 "movie_corpus" 作为表名
          </p>
          <p>
            <strong>字段名:</strong> 使用数据库字段名，如 "rating_score",
            "movie_id" 等
          </p>
        </div>
      </div>
    </div>
  )
}
