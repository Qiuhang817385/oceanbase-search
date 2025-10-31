'use client'

import {
  Input,
  Slider,
  Button,
  Tag,
  Card,
  Row,
  Col,
  Typography,
  message,
  Space,
} from 'antd'
import { SearchOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef, useCallback } from 'react'
import SearchPageSkeleton from './SearchPageSkeleton'
import styles from './styles/MovieSearchPage.module.css'
import MovieCard from '@/app/component/MovieCard'

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

interface MovieSearchPageProps {}

export default function MovieSearchPage({}: MovieSearchPageProps) {
  const defaultQuery = '机器人主题的带反转的科幻电影'
  const [searchQuery, setSearchQuery] = useState(defaultQuery)

  const [inputChangeValue, setInputChangeValue] = useState(defaultQuery)

  const [vectorResults, setVectorResults] = useState<MovieData[]>([])
  const [hybridResults, setHybridResults] = useState<MovieData[]>([])
  const [fullTextResults, setFullTextResults] = useState<MovieData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [messageApi, contextHolder] = message.useMessage()

  // 预设查询标签
  const presetQueries = [
    '周星弛',
    '曾志伟',
    '莱昂纳多',
    defaultQuery,
    '家庭关系修复的温暖治愈的电影',
    '诺兰执导的科幻电影推荐',
    '讲女性成长的电影',
  ]

  // 将实际的搜索逻辑提取为独立函数
  const performSearch = async ({ query }: { query: string }) => {
    try {
      // 并行调用多数据库向量搜索和混合搜索
      const [multiVectorResponse, hybridResponse, fullTextResponse] =
        await Promise.all([
          // 多数据库向量搜索
          fetch('/api/vector-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              limit: 10,
              databases: ['back'],
            }),
          }),
          // 混合搜索
          fetch('/api/multi-hybrid-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              limit: 10,
              databases: ['back'],
            }),
          }),
          // 全文搜索
          fetch('/api/full-text-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              limit: 10,
              databases: ['back'],
            }),
          }),
        ])

      const [multiVectorData, hybridData, fullTextData] = await Promise.all([
        multiVectorResponse.json(),
        hybridResponse.json(),
        fullTextResponse.json(),
      ])

      return {
        vectorResults: multiVectorData.success
          ? multiVectorData.data.results || []
          : [],
        hybridResults: hybridData.success ? hybridData.data.results || [] : [],
        fullTextResults: fullTextData.success
          ? fullTextData.data.results || []
          : [],
        success:
          multiVectorData.success || hybridData.success || fullTextData.success,
      }
    } catch (error) {
      console.error('搜索请求失败:', error)
      throw error
    }
  }

  const [showHitCacheInfo, setShowHitCacheInfo] = useState(false)
  const [tokenizeArray, setTokenizeArray] = useState([])

  const useSearchCache = () => {
    const cache = useRef(new Map())

    const cachedSearch = useCallback(async (query: string) => {
      const cacheKey = query.trim()
      if (cache.current.has(cacheKey)) {
        console.log('使用缓存结果：', cacheKey)
        setShowHitCacheInfo(true)
        setTimeout(() => {
          setShowHitCacheInfo(false)
        }, 3000)
        return cache.current.get(cacheKey)
      }
      console.log('执行新搜索：', cacheKey)
      const result = await performSearch({ query })
      cache.current.set(cacheKey, result)
      return result
    }, [])

    // 清理缓存的方法
    const clearCache = useCallback(() => {
      cache.current.clear()
      console.log('缓存已清理')
    }, [])

    // 获取缓存大小
    const getCacheSize = useCallback(() => {
      return cache.current.size
    }, [])

    return { cachedSearch, clearCache, getCacheSize }
  }

  const { cachedSearch, clearCache, getCacheSize } = useSearchCache()

  const handleSearch = async (query?: string) => {
    let realQuery = query || searchQuery

    if (!realQuery.trim()) return

    // 多数据库向量搜索
    const resTokenize = await fetch('/api/tokenize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: realQuery,
        limit: 10,
        databases: ['back'],
      }),
    })

    const dataTokenize = await resTokenize.json()
    const resTokenizeArray = Object.values(
      dataTokenize?.data?.results?.[0]
    )?.[0]
    setTokenizeArray(resTokenizeArray)
    setIsLoading(true)
    try {
      const result = await cachedSearch(realQuery)

      if (result.success) {
        setVectorResults(result.vectorResults)
        setHybridResults(result.hybridResults)
        setFullTextResults(result.fullTextResults)
      }
    } catch (error) {
      console.error('搜索请求失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const [isFTS, setIsFTS] = useState(false)

  useEffect(() => {
    if (showHitCacheInfo) {
      messageApi.info('命中缓存')
      setTimeout(() => {
        messageApi.destroy()
      }, 3000)
    }
  }, [showHitCacheInfo, messageApi])

  const handleSwitchIsFTS = () => {
    setIsFTS(!isFTS)
  }

  // 页面加载时自动执行一次搜索
  useEffect(() => {
    // 延迟执行初始搜索，让首屏先渲染
    const timer = setTimeout(() => {
      handleSearch()
      setIsInitialLoad(false)
    }, 100) // 100ms延迟，确保骨架屏先显示
    return () => clearTimeout(timer)
  }, [])

  const [hybridRadio, setHybridRadio] = useState(0.5)

  // 对搜索词进行停词过滤
  const stopWords = ['的', '了', '和', '与', '及', '或', '但', '而']

  const realSearchQuery = Array.from(new Set([searchQuery, ...tokenizeArray]))
    .filter((word: string) => !stopWords.includes(word))
    .join(' ')

  if (isInitialLoad) {
    return <SearchPageSkeleton />
  }

  return (
    <div className={styles.container}>
      {contextHolder}

      {/* 头部标题区域 */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <div>
            <Title level={1} className={styles.mainTitle}>
              混合搜索测试器
            </Title>
            <Text className={styles.subtitle}>电影混合搜索</Text>
          </div>
          <Button
            type="text"
            icon={<SettingOutlined />}
            className={styles.settingsButton}
          />
        </div>
      </div>
      {/* 搜索区域 */}
      <div className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <Search
            placeholder={defaultQuery}
            value={inputChangeValue}
            onChange={(e) => setInputChangeValue(e.target.value)}
            onSearch={(e) => {
              setSearchQuery(e)
              handleSearch(e)
            }}
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
            className={styles.searchInput}
          />

          {/* 预设查询标签 */}
          <div className={styles.presetTagsContainer}>
            {presetQueries.map((query, index) => (
              <Tag
                key={index}
                className={
                  searchQuery === query
                    ? styles.presetTagActive
                    : styles.presetTag
                }
                onClick={() => {
                  setSearchQuery(query)
                  setInputChangeValue(query)
                  handleSearch(query)
                }}
              >
                {query}
              </Tag>
            ))}
          </div>
        </div>
      </div>

      {/* <Row>
        <Col span={12}></Col>
        <Col span={12}>
          <span className={styles.sliderText}>混合搜索权重: {hybridRadio}</span>
          <Slider
            max={1}
            min={0}
            step={0.1}
            defaultValue={0.5}
            onChange={(v) => setHybridRadio(v)}
            value={hybridRadio}
          />
        </Col>
      </Row> */}
      {/* 双列结果展示 */}
      <Row gutter={24} className={styles.resultsRow}>
        {/* 向量搜索列 */}
        <Col span={12}>
          <Card
            className={styles.vectorSearchCard}
            styles={{
              body: {
                padding: 0,
              },
            }}
          >
            <div
              className={`${styles.vectorSearchHeader} ${
                isFTS ? styles.headerLayoutReverse : ''
              }`}
            >
              {/* <Avatar
                icon={<CompassOutlined />}
                style={{ backgroundColor: '#fa8c16', marginRight: 12 }}
              /> */}
              <>
                <>
                  <div
                    className={`${styles.switchOrigin} ${
                      isFTS ? styles.switchOriginRight : styles.switchOriginLeft
                    }`}
                  >
                    <Title level={3} className={styles.searchTitle}>
                      {isFTS ? '全文搜索' : '向量搜索'}
                    </Title>
                    <Text className={styles.searchSubtitle}>
                      {isFTS
                        ? '基于全文搜索的语义相似度匹配'
                        : '基于深度学习的语义相似度匹配'}
                    </Text>
                  </div>

                  <div
                    className={`${styles.switchButton} ${
                      isFTS
                        ? `${styles.positionLeft} ${styles.switchBorderRight}`
                        : `${styles.positionRight} ${styles.switchBorderLeft}`
                    }`}
                    onClick={() => {
                      handleSwitchIsFTS()
                    }}
                  >
                    <div className={`${styles.switchButtonText} `}>
                      {isFTS ? '向量搜索' : '全文搜索'}
                    </div>
                    <div className={styles.switchButtonSubText}>点击切换</div>
                  </div>
                </>
              </>
            </div>

            {(isFTS ? fullTextResults : vectorResults).length > 0 ? (
              (isFTS ? fullTextResults : vectorResults).map((movie, index) => {
                return (
                  <MovieCard
                    key={index}
                    movie={movie}
                    index={index}
                    isHybrid={false}
                    searchQuery={realSearchQuery}
                  />
                )
              })
            ) : (
              <div className={styles.emptyState}>暂无搜索结果</div>
            )}
          </Card>
        </Col>

        {/* 混合搜索列 */}
        <Col span={12}>
          <Card
            className={styles.hybridSearchCard}
            styles={{
              body: {
                padding: 0,
              },
            }}
          >
            <div className={styles.hybridSearchHeader}>
              {/* <Avatar
                icon={<LinkOutlined />}
                style={{ backgroundColor: '#1890ff', marginRight: 12 }}
              /> */}
              <div>
                <Title
                  level={3}
                  className={`${styles.searchTitle} ${styles.hybridSearchTitle}`}
                >
                  混合搜索
                </Title>
                <Text
                  className={`${styles.searchSubtitle} ${styles.hybridSearchSubtitle}`}
                >
                  结合语义理解与关键词精确匹配
                </Text>
              </div>
            </div>

            {hybridResults.length > 0 ? (
              hybridResults.map((movie, index) => (
                <MovieCard
                  key={index}
                  movie={movie}
                  index={index}
                  isHybrid={true}
                  searchQuery={realSearchQuery}
                />
              ))
            ) : (
              <div className={styles.emptyState}>暂无搜索结果</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
