'use client'

import {
  Input,
  Button,
  Tag,
  Card,
  Row,
  Col,
  Avatar,
  Progress,
  Typography,
  Space,
} from 'antd'
import {
  SearchOutlined,
  SettingOutlined,
  CompassOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import { useState, useEffect } from 'react'
import Image from 'next/image'

const { Search } = Input
const { Text, Title } = Typography

interface MovieData {
  id: string
  title: string
  originalTitle?: string
  summary: string
  year: number
  genres: string[]
  directors: string[]
  actors: string[]
  ratingScore: number
  ratingCount: number
  images: {
    small?: string
    medium?: string
    large?: string
  }
  distance?: number
}

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
  const [searchQuery, setSearchQuery] = useState('影史评分最高的5部电影')
  const [vectorResults, setVectorResults] = useState<MovieData[]>([])
  const [hybridResults, setHybridResults] = useState<MovieData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 预设查询标签
  const presetQueries = [
    '莱昂纳多',
    '影史评分最高的5部电影',
    '小李子出演的5部最经典电影',
    '林超贤评分最高的5部电影',
    '诺兰执导的科幻电影推荐',
    '豆瓣评分9分以上的经典影片',
    '汤姆·汉克斯主演的剧情片',
  ]

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      // 并行调用多数据库向量搜索和混合搜索
      const [multiVectorResponse, hybridResponse] = await Promise.all([
        // 多数据库向量搜索
        fetch('/api/multi-vector-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 5,
            // databases: ['main', 'back'], // 指定要搜索的数据库
            databases: ['back'], // 指定要搜索的数据库
          }),
        }),
        // 混合搜索
        // fetch('/api/hybrid-search', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     query: searchQuery,
        //     limit: 5,
        //     vectorWeight: 0.7,
        //     keywordWeight: 0.3,
        //   }),
        // }),
      ])

      const [multiVectorData, hybridData] = await Promise.all([
        multiVectorResponse.json(),
        {},
        // hybridResponse.json(),
      ])

      console.log('多数据库向量搜索结果:', multiVectorData)
      console.log('混合搜索结果:', hybridData)

      if (multiVectorData.success) {
        setVectorResults(multiVectorData.data.results || [])
      }

      if (hybridData.success) {
        setHybridResults(hybridData.data.results || [])
      }
    } catch (error) {
      console.error('搜索请求失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePresetQuery = (query: string) => {
    setSearchQuery(query)
  }

  // 页面加载时自动执行一次搜索
  useEffect(() => {
    handleSearch()
  }, [])

  const renderMovieCard = (
    movie: any,
    index: number,
    isHybrid: boolean = false
  ) => {
    // 处理不同的数据结构
    let similarity = '0.000'
    let score = 0

    if (isHybrid) {
      // 混合搜索结果
      score = movie.hybridScore || 0
      similarity = score.toFixed(3)
    } else {
      // 向量搜索结果 - 新数据结构可能没有相似度字段
      if (movie.distance !== undefined) {
        score = 1 - movie.distance
        similarity = score.toFixed(3)
      } else if (movie.vector_similarity !== undefined) {
        score = movie.vector_similarity
        similarity = score.toFixed(3)
      } else {
        // 如果没有相似度数据，使用评分作为替代
        score = (movie.rating_score || 0) / 10
        similarity = movie.rating_score ? movie.rating_score.toFixed(1) : 'N/A'
      }
    }

    const imageUrl =
      movie.images?.small || movie.images?.medium || movie.images?.large
    const title = movie.title || movie.original_title || '未知标题'
    const summary = movie.summary || '暂无简介'

    // 处理新的 actors 格式 - 简单字符串
    const actors = movie.actors || '未知'

    // 处理新的 genres 格式 - 简单字符串，按空格分割
    const genres = movie.genres
      ? movie.genres.split(' ').filter((g: string) => g.trim())
      : []

    return (
      <Card
        key={movie.id}
        style={{
          marginBottom: 16,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Row gutter={16}>
          <Col span={6}>
            {imageUrl ? (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 120,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  sizes="120px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 120,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                }}
              >
                暂无图片
              </div>
            )}
          </Col>
          <Col span={18}>
            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#999', marginRight: 8 }}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Title level={4} style={{ margin: 0, display: 'inline' }}>
                {title}
              </Title>
              {movie.year && (
                <Text style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                  ({movie.year})
                </Text>
              )}
            </div>

            <Text
              style={{
                fontSize: 12,
                color: '#666',
                lineHeight: 1.5,
                display: 'block',
                marginBottom: 8,
              }}
            >
              {summary}
            </Text>

            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>演员: </Text>
              <Text style={{ fontSize: 12 }}>{actors}</Text>
            </div>

            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>类型: </Text>
              <Space size={4}>
                {genres.slice(0, 3).map((genre: string, idx: number) => (
                  <Tag
                    key={idx}
                    style={{ fontSize: 11, borderRadius: 12, margin: 0 }}
                  >
                    {genre}
                  </Tag>
                ))}
              </Space>
            </div>

            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>导演: </Text>
              <Text style={{ fontSize: 12 }}>{movie.directors || '未知'}</Text>
            </div>

            <div>
              <Text style={{ fontSize: 12, color: '#666' }}>
                {isHybrid
                  ? '混合评分'
                  : movie.distance !== undefined
                  ? '相似度'
                  : '评分'}
                :
              </Text>
              <Text
                style={{ fontSize: 12, color: '#1890ff', fontWeight: 'bold' }}
              >
                {similarity}
              </Text>
              <div style={{ marginTop: 4 }}>
                <Progress
                  percent={score * 100}
                  showInfo={false}
                  strokeColor="#1890ff"
                  size="small"
                />
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    )
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#fafafa',
        minHeight: '100vh',
      }}
    >
      {/* 头部标题区域 */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <div>
            <Title
              level={1}
              style={{ margin: 0, color: '#262626', fontSize: 32 }}
            >
              混合搜索测试器
            </Title>
            <Text style={{ fontSize: 16, color: '#8c8c8c' }}>
              豆瓣电影混合搜索
            </Text>
          </div>
          <Button
            type="text"
            icon={<SettingOutlined />}
            style={{ color: '#8c8c8c' }}
          />
        </div>
      </div>
      {/* 搜索区域 */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Search
            placeholder="影史评分最高的5部电影"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            enterButton={
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={isLoading}
              >
                搜索
              </Button>
            }
            size="large"
            style={{ marginBottom: 16 }}
          />

          {/* 预设查询标签 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            {presetQueries.map((query, index) => (
              <Tag
                key={index}
                style={{
                  cursor: 'pointer',
                  borderRadius: 16,
                  padding: '4px 12px',
                  backgroundColor:
                    searchQuery === query ? '#e6f7ff' : '#f5f5f5',
                  border:
                    searchQuery === query
                      ? '1px solid #1890ff'
                      : '1px solid #d9d9d9',
                  color: searchQuery === query ? '#1890ff' : '#666',
                }}
                onClick={() => handlePresetQuery(query)}
              >
                {query}
              </Tag>
            ))}
          </div>
        </div>
      </div>
      {/* 双列结果展示 */}
      <Row gutter={24}>
        {/* 向量搜索列 */}
        <Col span={12}>
          <Card
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: 'fit-content',
            }}
            bodyStyle={{ padding: 20 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Avatar
                icon={<CompassOutlined />}
                style={{ backgroundColor: '#fa8c16', marginRight: 12 }}
              />
              <div>
                <Title level={3} style={{ margin: 0, color: '#262626' }}>
                  向量搜索
                </Title>
                <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                  基于深度学习的语义相似度匹配
                </Text>
              </div>
            </div>

            {vectorResults.length > 0 ? (
              vectorResults.map((movie, index) =>
                renderMovieCard(movie, index, false)
              )
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#8c8c8c',
                }}
              >
                暂无搜索结果
              </div>
            )}
          </Card>
        </Col>

        {/* 混合搜索列 */}
        <Col span={12}>
          <Card
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: 'fit-content',
            }}
            bodyStyle={{ padding: 20 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Avatar
                icon={<LinkOutlined />}
                style={{ backgroundColor: '#1890ff', marginRight: 12 }}
              />
              <div>
                <Title level={3} style={{ margin: 0, color: '#262626' }}>
                  混合搜索
                </Title>
                <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                  结合语义理解与关键词精确匹配
                </Text>
              </div>
            </div>

            {hybridResults.length > 0 ? (
              hybridResults.map((movie, index) =>
                renderMovieCard(movie, index, true)
              )
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#8c8c8c',
                }}
              >
                暂无搜索结果
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
