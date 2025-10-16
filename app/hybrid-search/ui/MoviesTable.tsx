'use client'

import { Table, Typography, Tag, Rate, Button, Space } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { MovieData } from '@/lib/movies'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const { Text, Title } = Typography

interface MoviesTableProps {
  movies: MovieData[]
}

export default function MoviesTable({ movies }: MoviesTableProps) {
  const router = useRouter()

  // 处理数组数据的显示
  const renderArrayData = (data: any) => {
    if (!data) return '-'
    if (Array.isArray(data)) {
      return data.map((item, index) => (
        <Tag key={index} color="blue" style={{ margin: '2px' }}>
          {typeof item === 'string' ? item.replace(/[\[\]'"]/g, '') : item}
        </Tag>
      ))
    }
    return <Tag color="blue">{data}</Tag>
  }

  // 处理评分显示
  const renderRating = (score: number | null) => {
    if (!score) return '-'
    return (
      <Space direction="vertical" size={0}>
        <Rate disabled value={score / 2} style={{ fontSize: 12 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {score}/10
        </Text>
      </Space>
    )
  }

  // 处理图片显示
  const renderImage = (images: any) => {
    if (!images) return '-'

    // 优先使用 small 图片，如果没有则使用 medium，最后使用 large
    const imageUrl = images.small || images.medium || images.large

    if (!imageUrl) return '-'

    return (
      <div
        style={{
          position: 'relative',
          width: 60,
          height: 80,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Image
          src={imageUrl}
          alt="电影海报"
          fill
          sizes="60px"
          style={{ objectFit: 'cover' }}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        />
      </div>
    )
  }

  const columns = [
    {
      title: '海报',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      render: renderImage,
    },
    {
      title: '电影信息',
      key: 'movieInfo',
      width: 300,
      render: (record: MovieData) => (
        <div>
          <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
            {record.title}
          </Title>
          {record.originalTitle && record.originalTitle !== record.title && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.originalTitle}
            </Text>
          )}
          <div style={{ marginTop: 8 }}>{renderArrayData(record.genres)}</div>
        </div>
      ),
    },
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
      width: 80,
      render: (year: number) => year || '-',
    },
    {
      title: '国家',
      dataIndex: 'countries',
      key: 'countries',
      width: 120,
      render: renderArrayData,
    },
    {
      title: '语言',
      dataIndex: 'languages',
      key: 'languages',
      width: 120,
      render: renderArrayData,
    },
    {
      title: '评分',
      dataIndex: 'ratingScore',
      key: 'ratingScore',
      width: 100,
      render: renderRating,
    },
    {
      title: '评分人数',
      dataIndex: 'ratingCount',
      key: 'ratingCount',
      width: 100,
      render: (count: number) => (count ? count.toLocaleString() : '-'),
    },
    {
      title: '简介',
      dataIndex: 'summary',
      key: 'summary',
      width: 200,
      render: (text: string) => (
        <Text
          style={{ width: 180 }}
          ellipsis={{
            tooltip: text,
          }}
        >
          {text || '-'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (record: MovieData) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/prisma-search/${record.id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={movies}
      pagination={false}
      rowKey="id"
      scroll={{ x: 1200 }}
      size="small"
    />
  )
}
