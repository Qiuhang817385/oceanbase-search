'use client'

import { Table, Typography } from 'antd'
import { MovieData } from '@/lib/movies'

const { Text } = Typography

interface MoviesTableProps {
  movies: MovieData[]
}

export default function MoviesTable({ movies }: MoviesTableProps) {
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: 'Genres',
      dataIndex: 'genres',
      key: 'genres',
    },
    {
      title: 'Countries',
      dataIndex: 'countries',
      key: 'countries',
    },
    {
      title: 'Languages',
      dataIndex: 'languages',
      key: 'languages',
    },
    {
      title: 'Summary',
      dataIndex: 'summary',
      key: 'summary',
      render: (text: string) => (
        <Text
          style={{
            width: 200,
          }}
          ellipsis={{
            tooltip: true,
          }}
        >
          {text}
        </Text>
      ),
      width: 200,
    },
    {
      title: 'Rating Score',
      dataIndex: 'ratingScore',
      key: 'ratingScore',
    },
    {
      title: 'Rating Count',
      dataIndex: 'ratingCount',
      key: 'ratingCount',
    },
    {
      title: 'Images',
      dataIndex: 'images',
      key: 'images',
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={movies}
      pagination={false}
      rowKey="id"
    />
  )
}
