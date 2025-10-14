'use client'

import {
  Card,
  Typography,
  Tag,
  Rate,
  Row,
  Col,
  Space,
  Button,
  Divider,
} from 'antd'
import Image from 'next/image'
import { ArrowLeftOutlined, StarOutlined } from '@ant-design/icons'
import { MovieData } from '@/lib/movies'
import { useRouter } from 'next/navigation'

const { Title, Text, Paragraph } = Typography

interface MovieDetailPageProps {
  movie: MovieData
}

export default function MovieDetailPage({ movie }: MovieDetailPageProps) {
  const router = useRouter()

  // 处理数组数据的显示
  const renderArrayData = (data: any, color: string = 'blue') => {
    if (!data) return '-'
    if (Array.isArray(data)) {
      return data.map((item, index) => (
        <Tag key={index} color={color} style={{ margin: '2px' }}>
          {typeof item === 'string' ? item.replace(/[\[\]'"]/g, '') : item}
        </Tag>
      ))
    }
    return <Tag color={color}>{data}</Tag>
  }

  // 处理导演和演员信息
  const renderPersonInfo = (data: any) => {
    if (!data) return '-'
    if (Array.isArray(data)) {
      return data.map((item, index) => {
        if (typeof item === 'string') {
          // 尝试解析字符串中的姓名
          const nameMatch = item.match(/'name':\s*'([^']+)'/)
          if (nameMatch) {
            return (
              <Tag key={index} color="purple" style={{ margin: '2px' }}>
                {nameMatch[1]}
              </Tag>
            )
          }
          return (
            <Tag key={index} color="purple" style={{ margin: '2px' }}>
              {item.replace(/[\[\]'"]/g, '')}
            </Tag>
          )
        }
        return (
          <Tag key={index} color="purple" style={{ margin: '2px' }}>
            {item}
          </Tag>
        )
      })
    }
    return <Tag color="purple">{data}</Tag>
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 返回按钮 */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.back()}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card>
        <Row gutter={[24, 24]}>
          {/* 左侧海报 */}
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              {movie.images &&
              (movie.images.large ||
                movie.images.medium ||
                movie.images.small) ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 300,
                    height: 400,
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src={
                      movie.images.large ||
                      movie.images.medium ||
                      movie.images.small
                    }
                    alt={movie.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    style={{ objectFit: 'cover' }}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 400,
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                  }}
                >
                  <Text type="secondary">暂无海报</Text>
                </div>
              )}
            </div>
          </Col>

          {/* 右侧信息 */}
          <Col xs={24} md={16}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 标题和评分 */}
              <div>
                <Title level={1} style={{ margin: 0, marginBottom: 8 }}>
                  {movie.title}
                </Title>
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                  <Title
                    level={3}
                    type="secondary"
                    style={{ margin: 0, marginBottom: 16 }}
                  >
                    {movie.originalTitle}
                  </Title>
                )}

                {/* 评分信息 */}
                <Space size="large" align="center">
                  <div>
                    <Space align="center">
                      <StarOutlined style={{ color: '#faad14' }} />
                      <Text strong style={{ fontSize: 24 }}>
                        {movie.ratingScore || 'N/A'}
                      </Text>
                      <Text type="secondary">/ 10</Text>
                    </Space>
                    <div>
                      <Rate disabled value={(movie.ratingScore || 0) / 2} />
                    </div>
                  </div>
                  {movie.ratingCount && (
                    <Text type="secondary">
                      {movie.ratingCount.toLocaleString()} 人评价
                    </Text>
                  )}
                </Space>
              </div>

              {/* 基本信息 */}
              <div>
                <Title level={4}>基本信息</Title>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>年份：</Text>
                    <Text>{movie.year || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>类型：</Text>
                    <div style={{ marginTop: 4 }}>
                      {renderArrayData(movie.genres, 'blue')}
                    </div>
                  </Col>
                  <Col span={12}>
                    <Text strong>国家：</Text>
                    <div style={{ marginTop: 4 }}>
                      {renderArrayData(movie.countries, 'green')}
                    </div>
                  </Col>
                  <Col span={12}>
                    <Text strong>语言：</Text>
                    <div style={{ marginTop: 4 }}>
                      {renderArrayData(movie.languages, 'orange')}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* 导演和演员 */}
              <div>
                <Title level={4}>演职人员</Title>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Text strong>导演：</Text>
                    <div style={{ marginTop: 4 }}>
                      {renderPersonInfo(movie.directors)}
                    </div>
                  </Col>
                  <Col span={24}>
                    <Text strong>演员：</Text>
                    <div style={{ marginTop: 4 }}>
                      {renderPersonInfo(movie.actors)}
                    </div>
                  </Col>
                </Row>
              </div>
            </Space>
          </Col>
        </Row>

        <Divider />

        {/* 剧情简介 */}
        <div>
          <Title level={4}>剧情简介</Title>
          <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
            {movie.summary || '暂无简介'}
          </Paragraph>
        </div>

        {/* 技术信息 */}
        <Divider />
        <div>
          <Title level={4}>技术信息</Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text strong>电影ID：</Text>
              <Text code>{movie.movieId}</Text>
            </Col>
            <Col span={12}>
              <Text strong>组件代码：</Text>
              <Text code>{movie.componentCode}</Text>
            </Col>
            <Col span={12}>
              <Text strong>数据库ID：</Text>
              <Text code>{movie.id}</Text>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  )
}
