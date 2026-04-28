/**
 * 数据库表名常量
 * 用于统一管理 API 中使用的数据库表名
 */

// 数据库表名常量
export const DATABASE_TABLES = {
  // 主数据库表名
  MOVIE_CORPUS: 'movie_corpus',

  // 备用键位默认也指向 movie_corpus，避免连接库中无表导致查询失败
  MOVIES_WITH_RATING: 'movie_corpus',
} as const

// 数据库键名常量
export const DATABASE_KEYS = {
  MAIN: 'main',
  BACK: 'back',
} as const

// 根据数据库键获取表名的辅助函数
export const getTableName = (dbKey: string): string => {
  return dbKey === DATABASE_KEYS.BACK
    ? DATABASE_TABLES.MOVIES_WITH_RATING
    : DATABASE_TABLES.MOVIE_CORPUS
}

// 表名类型定义
export type DatabaseTable =
  (typeof DATABASE_TABLES)[keyof typeof DATABASE_TABLES]
export type DatabaseKey = (typeof DATABASE_KEYS)[keyof typeof DATABASE_KEYS]
