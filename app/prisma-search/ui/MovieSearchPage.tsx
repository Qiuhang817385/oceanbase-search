'use client'

import { Card, Input, Select, Button, Space, Row, Col } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMovieSearch } from '@/lib/hooks/useMovieSearch'
import MoviesTable from './MoviesTable'
import Pagination from './Pagination'
import { MovieData } from '@/lib/movies'

const { Search } = Input
const { Option } = Select

interface MovieSearchPageProps {
  initialData: {
    movies: MovieData[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  initialQuery: Record<string, string | undefined>
}

export default function MovieSearchPage({
  initialData,
  initialQuery,
}: MovieSearchPageProps) {
  const {
    movies,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    resetFilters,
    goToPage,
    changePageSize,
    mutate,
  } = useMovieSearch({ initialData, initialQuery })

  // 年份选项（示例数据）
  const yearOptions = Array.from({ length: 30 }, (_, i) => 2024 - i)

  // 类型选项（示例数据）
  const genreOptions = [
    '动作',
    '喜剧',
    '剧情',
    '科幻',
    '恐怖',
    '爱情',
    '动画',
    '悬疑',
    '惊悚',
    '犯罪',
  ]

  const handleSearch = (value: string) => {
    updateFilters({ search: value, page: 1 })
  }

  const handleYearChange = (year: string) => {
    updateFilters({ year, page: 1 })
  }

  const handleGenreChange = (genre: string) => {
    updateFilters({ genre, page: 1 })
  }

  const handleRefresh = () => {
    mutate()
  }

  if (error) {
    return (
      <Card title="错误">
        <p>加载数据时出现错误: {error.message}</p>
        <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
          重新加载
        </Button>
      </Card>
    )
  }

  return (
    <Card title="Prisma 数据库演示(演示 Prisma ORM 的基本 CRUD 操作)">
      {/* 搜索和过滤区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="搜索电影标题、摘要..."
            allowClear
            onSearch={handleSearch}
            defaultValue={filters.search}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            placeholder="选择年份"
            allowClear
            style={{ width: '100%' }}
            onChange={handleYearChange}
            value={filters.year}
          >
            {yearOptions.map((year) => (
              <Option key={year} value={year.toString()}>
                {year}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            placeholder="选择类型"
            allowClear
            style={{ width: '100%' }}
            onChange={handleGenreChange}
            value={filters.genre}
          >
            {genreOptions.map((genre) => (
              <Option key={genre} value={genre}>
                {genre}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Space>
            <Button onClick={resetFilters}>重置</Button>
            <Button
              onClick={handleRefresh}
              icon={<ReloadOutlined />}
              loading={isLoading}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 表格 */}
      <MoviesTable movies={movies} />

      {/* 分页 */}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Pagination
          current={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
        />
      </div>
    </Card>
  )
}
