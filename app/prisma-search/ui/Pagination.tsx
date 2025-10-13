'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Pagination as AntPagination } from 'antd'

interface PaginationProps {
  current: number
  pageSize: number
  total: number
}

export default function Pagination({
  current,
  pageSize,
  total,
}: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (page: number, size: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    params.set('limit', size.toString())

    // 使用 router.push 进行客户端导航，保持 SSR 的优势
    router.push(`?${params.toString()}`)
  }

  return (
    <AntPagination
      current={current}
      pageSize={pageSize}
      total={total}
      showSizeChanger
      showQuickJumper
      showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
      onChange={handleChange}
      onShowSizeChange={handleChange}
    />
  )
}
