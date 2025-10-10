'use client'

import { useState, useEffect } from 'react'
import { Button } from 'antd'
import { useRequest } from 'ahooks'
import { Table, Tooltip, Typography } from 'antd'
const { Text } = Typography

// 类型定义
interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
  posts: Post[]
}

interface Post {
  id: string
  title: string
  content: string | null
  published: boolean
  createdAt: string
  author: User
}

export default function PrismaDemo() {
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    data: movies,
    loading: queryMoviesLoading,
    error: usersError,
    run: queryMovies,
  } = useRequest(
    async () => {
      const response = await fetch(`/api/movies?page=${page}&limit=${limit}`, {
        method: 'GET',
      })
      const data = await response.json()
      return data
    },
    {
      refreshDeps: [page, limit],
    }
  )

  // 防止水合错误
  if (!mounted) {
    return (
      <div
        title="Prisma 数据库演示"
        description="演示 Prisma ORM 的基本 CRUD 操作"
        maxWidth="4xl"
      >
        <div>
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">加载中...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      title="Prisma 数据库演示"
      description="演示 Prisma ORM 的基本 CRUD 操作"
      maxWidth="4xl"
    >
      <Table
        columns={[
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
          // {
          //   title: 'Directors',
          //   dataIndex: 'directors',
          //   key: 'directors',
          // },
          // {
          //   title: 'Actors',
          //   dataIndex: 'actors',
          //   key: 'actors',
          // },
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
        ]}
        loading={queryMoviesLoading}
        dataSource={movies?.data?.movies}
        pagination={{
          pageSize: limit,
          current: page,
          total: movies?.data?.pagination?.total,
          onChange: (page, limit) => {
            console.log('page', page)
            setPage(page)
            setLimit(limit)
          },
        }}
      />
    </div>
  )
}
