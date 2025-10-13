'use client'

import { useState } from 'react'
import {
  Button,
  Input,
  Card,
  Slider,
  Select,
  Space,
  Typography,
  Divider,
  Tag,
  Row,
  Col,
} from 'antd'
import {
  SearchOutlined,
  RobotOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface SearchResult {
  id: string
  title: string
  original_title?: string
  year?: number
  genres?: any
  directors?: any
  actors?: any
  summary?: string
  rating_score?: number
  rating_count?: number
  images?: any
  hybridScore: number
  vectorSimilarity: number
  keywordScore: number
  searchType: 'hybrid' | 'vector' | 'keyword'
}

export default function HybridSearchDemo() {
  const [query, setQuery] = useState('')
  const [vectorWeight, setVectorWeight] = useState(0.7)
  const [keywordWeight, setKeywordWeight] = useState(0.3)
  const [year, setYear] = useState<number | undefined>()
  const [genre, setGenre] = useState<string>('')
  const [minRating, setMinRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchStats, setSearchStats] = useState<any>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/hybrid-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          vectorWeight,
          keywordWeight,
          year,
          genre: genre || undefined,
          minRating,
          limit: 20,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.data.results)
        setSearchStats(data.data.searchStats)
      } else {
        console.error('搜索失败:', data.error)
      }
    } catch (error) {
      console.error('搜索请求失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'hybrid':
        return <ThunderboltOutlined style={{ color: '#1890ff' }} />
      case 'vector':
        return <RobotOutlined style={{ color: '#52c41a' }} />
      case 'keyword':
        return <FileTextOutlined style={{ color: '#fa8c16' }} />
      default:
        return null
    }
  }

  const getSearchTypeText = (type: string) => {
    switch (type) {
      case 'hybrid':
        return '混合检索'
      case 'vector':
        return '向量检索'
      case 'keyword':
        return '关键词检索'
      default:
        return type
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>🎯 混合检索演示</Title>
      <Paragraph>结合向量相似性搜索和关键词匹配的智能电影检索系统</Paragraph>

      <Card title="搜索配置" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>搜索查询：</Text>
            <TextArea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入电影名称、剧情描述或任何相关内容..."
              rows={3}
              style={{ marginTop: '8px' }}
            />
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <div>
                <Text strong>向量权重：{vectorWeight}</Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={vectorWeight}
                  onChange={setVectorWeight}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text strong>关键词权重：{keywordWeight}</Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={keywordWeight}
                  onChange={setKeywordWeight}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <div>
                <Text strong>年份：</Text>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) =>
                    setYear(
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  placeholder="例如：2023"
                  style={{ marginTop: '8px' }}
                />
              </div>
            </Col>
            <Col span={8}>
              <div>
                <Text strong>类型：</Text>
                <Input
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="例如：动作"
                  style={{ marginTop: '8px' }}
                />
              </div>
            </Col>
            <Col span={8}>
              <div>
                <Text strong>最低评分：</Text>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={minRating}
                  onChange={(e) =>
                    setMinRating(parseFloat(e.target.value) || 0)
                  }
                  placeholder="例如：7.0"
                  style={{ marginTop: '8px' }}
                />
              </div>
            </Col>
          </Row>

          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
            size="large"
            style={{ width: '100%' }}
          >
            开始混合检索
          </Button>
        </Space>
      </Card>

      {searchStats && (
        <Card title="搜索统计" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: '#52c41a', margin: 0 }}>
                  {searchStats.vectorResults}
                </Title>
                <Text>向量搜索结果</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: '#fa8c16', margin: 0 }}>
                  {searchStats.keywordResults}
                </Title>
                <Text>关键词搜索结果</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: '#1890ff', margin: 0 }}>
                  {searchStats.combinedResults}
                </Title>
                <Text>最终结果数量</Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {results.length > 0 && (
        <Card title={`搜索结果 (${results.length} 部电影)`}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {results.map((movie, index) => (
              <Card
                key={movie.id}
                size="small"
                style={{ border: '1px solid #f0f0f0' }}
              >
                <Row gutter={16}>
                  <Col span={18}>
                    <div>
                      <Title level={4} style={{ margin: '0 0 8px 0' }}>
                        {movie.title}
                        {movie.original_title &&
                          movie.original_title !== movie.title && (
                            <Text
                              type="secondary"
                              style={{ fontSize: '14px', marginLeft: '8px' }}
                            >
                              ({movie.original_title})
                            </Text>
                          )}
                      </Title>

                      <Space wrap style={{ marginBottom: '8px' }}>
                        {movie.year && <Tag color="blue">{movie.year}</Tag>}
                        {movie.rating_score && (
                          <Tag color="green">
                            ⭐ {movie.rating_score} ({movie.rating_count} 评价)
                          </Tag>
                        )}
                        <Tag
                          icon={getSearchTypeIcon(movie.searchType)}
                          color="purple"
                        >
                          {getSearchTypeText(movie.searchType)}
                        </Tag>
                        <Tag color="orange">
                          混合分数: {movie.hybridScore.toFixed(3)}
                        </Tag>
                      </Space>

                      {movie.genres && Array.isArray(movie.genres) && (
                        <div style={{ marginBottom: '8px' }}>
                          <Text strong>类型：</Text>
                          <Space wrap>
                            {movie.genres.map((g: string, i: number) => (
                              <Tag key={i} color="cyan">
                                {g}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      )}

                      {movie.directors && Array.isArray(movie.directors) && (
                        <div style={{ marginBottom: '8px' }}>
                          <Text strong>导演：</Text>
                          <Text>{movie.directors.join(', ')}</Text>
                        </div>
                      )}

                      {movie.summary && (
                        <div>
                          <Text strong>简介：</Text>
                          <Paragraph
                            ellipsis={{ rows: 2, expandable: true }}
                            style={{ margin: '4px 0 0 0' }}
                          >
                            {movie.summary}
                          </Paragraph>
                        </div>
                      )}
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>向量相似度：</Text>
                        <br />
                        <Text style={{ color: '#52c41a' }}>
                          {(movie.vectorSimilarity * 100).toFixed(1)}%
                        </Text>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>关键词匹配：</Text>
                        <br />
                        <Text style={{ color: '#fa8c16' }}>
                          {movie.keywordScore}/3
                        </Text>
                      </div>
                      <div>
                        <Text strong>综合评分：</Text>
                        <br />
                        <Text
                          style={{
                            color: '#1890ff',
                            fontSize: '16px',
                            fontWeight: 'bold',
                          }}
                        >
                          {(movie.hybridScore * 100).toFixed(1)}%
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        </Card>
      )}
    </div>
  )
}
