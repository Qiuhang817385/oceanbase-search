// app/hybrid-search/ui/components/MovieCard.tsx
import React from 'react'
import { Row, Col, Typography, Tag, Space, Divider } from 'antd'
import createHighlighting, {
  createHighlightsManually,
} from '@/lib/highlighting'
import styles from './index.module.css'

const { Text, Title } = Typography

interface MovieCardProps {
  movie: any
  index: number
  isHybrid?: boolean
  searchQuery: string
}

const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  index,
  isHybrid = false,
  searchQuery,
}) => {
  // 处理不同的数据结构
  let similarity = '0.000'
  let score = 0

  if (isHybrid) {
    score = movie.hybridScore || 0
    similarity = score.toFixed(3)
  } else {
    if (movie.distance !== undefined) {
      score = 1 - movie.distance
      similarity = score.toFixed(3)
    } else if (movie.vector_similarity !== undefined) {
      score = movie.vector_similarity
      similarity = score.toFixed(3)
    } else {
      score = (movie.rating_score || 0) / 10
      similarity = movie.rating_score ? movie.rating_score.toFixed(1) : 'N/A'
    }
  }

  const title = movie.title || movie.original_title || '未知标题'
  const summary = movie.summary || '暂无简介'
  const actors = movie.actors || '未知'
  const genres = movie?.genres
    ? movie?.genres?.split(' ').filter((g: string) => g.trim())
    : []

  const highlightsField = createHighlightsManually(movie, searchQuery)

  return (
    <Row className={styles.movieCardRow} gutter={16}>
      <Col span={24}>
        <div className={styles.movieCardContent}>
          <Text className={styles.movieRank}>
            {String(index + 1).padStart(2, '0')}
          </Text>
          <Title level={4} className={styles.movieTitle}>
            {title}
          </Title>
          {movie.year && (
            <Text className={styles.movieYear}>({movie.year})</Text>
          )}
        </div>

        <Text className={styles.movieSummary}>
          <Text
            className={styles.movieSummaryText}
            ellipsis={{
              tooltip: {
                color: '#fff',
                styles: {
                  body: {
                    background: '#000',
                  },
                },
                title: (
                  <>
                    {highlightsField?.length > 0 ? (
                      <span
                        dangerouslySetInnerHTML={createHighlighting(
                          highlightsField,
                          `summary`,
                          summary
                        )}
                      />
                    ) : (
                      summary
                    )}
                  </>
                ),
              },
            }}
          >
            <span className={styles.movieSummaryText}>{`简介: `}</span>
            {highlightsField?.length > 0 ? (
              <span
                dangerouslySetInnerHTML={createHighlighting(
                  highlightsField,
                  `summary`,
                  summary
                )}
              />
            ) : (
              summary
            )}
          </Text>
        </Text>

        <div className={styles.movieActors}>
          <Text className={styles.movieActorsLabel}>演员: </Text>
          <Text className={styles.movieActorsText}>
            {highlightsField?.length > 0 ? (
              <span
                dangerouslySetInnerHTML={createHighlighting(
                  highlightsField,
                  `actors`,
                  actors
                )}
              />
            ) : (
              actors
            )}
          </Text>
        </div>

        <div className={styles.movieGenres}>
          <Text className={styles.movieGenresLabel}>类型: </Text>
          <Space size={4}>
            {genres.slice(0, 3).map((genre: string, idx: number) => (
              <Tag key={idx} className={styles.movieGenreTag}>
                {genre}
              </Tag>
            ))}
          </Space>
        </div>

        <div className={styles.movieDirectors}>
          <Text className={styles.movieDirectorsLabel}>导演: </Text>
          <Text className={styles.movieDirectorsText}>
            {movie.directors || '未知'}
          </Text>
        </div>

        <div className={styles.movieScore}>
          <Text className={styles.movieScoreLabel}>
            {isHybrid
              ? '混合评分'
              : movie.distance !== undefined
              ? '相似度'
              : '评分'}
            :
          </Text>
          <Text className={styles.movieScoreValue}>{similarity}</Text>
          <Divider className={styles.movieDivider} />
        </div>
      </Col>
    </Row>
  )
}

export default MovieCard
