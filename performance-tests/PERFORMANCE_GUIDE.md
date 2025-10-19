# 🚀 OceanBase Search 性能测试最佳实践指南

## 📋 测试前准备

### 1. 环境准备

**服务器环境**

- 确保测试服务器配置与生产环境相似
- 关闭不必要的服务和进程
- 确保网络连接稳定
- 准备足够的测试数据（建议至少 10,000 条电影记录）

**数据库准备**

```sql
-- 检查数据量
SELECT COUNT(*) FROM movie_corpus;

-- 检查索引
SHOW INDEX FROM movie_corpus;

-- 检查向量数据
SELECT COUNT(*) FROM movie_corpus WHERE embedding IS NOT NULL;
```

### 2. 配置优化

**Next.js 配置优化**

```javascript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['antd', '@ant-design/icons'],
  },
  images: {
    domains: ['your-image-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
}
```

**Prisma 配置优化**

```javascript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})
```

## 🎯 测试执行策略

### 1. 测试顺序

**推荐执行顺序**：

1. **数据库性能测试** - 确保数据库基础性能
2. **API 性能测试** - 测试后端接口性能
3. **混合搜索测试** - 测试核心搜索功能
4. **前端性能测试** - 测试用户界面性能
5. **负载测试** - 测试系统整体承受能力

### 2. 测试参数调优

**API 测试参数**

```javascript
// 根据服务器配置调整
const CONCURRENT_REQUESTS = 10 // 并发请求数
const TOTAL_REQUESTS = 100 // 总请求数
const TIMEOUT = 30000 // 超时时间
```

**负载测试参数**

```yaml
# artillery-config.yml
phases:
  - duration: 30 # 预热阶段
    arrivalRate: 2
  - duration: 60 # 正常负载
    arrivalRate: 5
  - duration: 30 # 高负载
    arrivalRate: 10
  - duration: 20 # 峰值负载
    arrivalRate: 20
```

## 📊 性能基准和阈值

### 1. API 性能基准

| 接口类型 | 优秀     | 良好     | 需要优化    | 严重问题 |
| -------- | -------- | -------- | ----------- | -------- |
| 基础查询 | < 200ms  | < 500ms  | 500-1000ms  | > 1000ms |
| 搜索查询 | < 300ms  | < 800ms  | 800-1500ms  | > 1500ms |
| 混合搜索 | < 1000ms | < 2000ms | 2000-3000ms | > 3000ms |
| 统计查询 | < 500ms  | < 1000ms | 1000-2000ms | > 2000ms |

### 2. 前端性能基准

| 指标 | 优秀    | 良好    | 需要优化  | 严重问题 |
| ---- | ------- | ------- | --------- | -------- |
| FCP  | < 1.8s  | < 3.0s  | 3.0-4.0s  | > 4.0s   |
| LCP  | < 2.5s  | < 4.0s  | 4.0-6.0s  | > 6.0s   |
| FID  | < 100ms | < 300ms | 300-500ms | > 500ms  |
| CLS  | < 0.1   | < 0.25  | 0.25-0.5  | > 0.5    |

### 3. 数据库性能基准

| 查询类型 | 优秀    | 良好     | 需要优化    | 严重问题 |
| -------- | ------- | -------- | ----------- | -------- |
| 基础查询 | < 50ms  | < 100ms  | 100-200ms   | > 200ms  |
| 复杂查询 | < 200ms | < 500ms  | 500-1000ms  | > 1000ms |
| 向量搜索 | < 500ms | < 1000ms | 1000-2000ms | > 2000ms |
| 聚合查询 | < 300ms | < 800ms  | 800-1500ms  | > 1500ms |

## 🔧 性能优化策略

### 1. API 层优化

**缓存策略**

```javascript
// 使用 Redis 缓存
const redis = require('redis')
const client = redis.createClient()

// 缓存热门查询
const cacheKey = `movies:${JSON.stringify(params)}`
const cached = await client.get(cacheKey)
if (cached) return JSON.parse(cached)

// 缓存结果
await client.setex(cacheKey, 300, JSON.stringify(result))
```

**数据库查询优化**

```javascript
// 使用 select 只查询需要的字段
const movies = await prisma.movieCorpus.findMany({
  select: {
    id: true,
    title: true,
    year: true,
    ratingScore: true,
  },
  where: { year: 2023 },
  orderBy: { ratingScore: 'desc' },
  take: 20,
})
```

**分页优化**

```javascript
// 使用游标分页替代偏移分页
const movies = await prisma.movieCorpus.findMany({
  where: {
    id: { gt: lastId },
    year: 2023,
  },
  orderBy: { id: 'asc' },
  take: 20,
})
```

### 2. 前端优化

**代码分割**

```javascript
// 动态导入组件
const MovieSearchPage = dynamic(() => import('./MovieSearchPage'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
})
```

**图片优化**

```javascript
// 使用 Next.js Image 组件
import Image from 'next/image'
;<Image
  src={movie.poster}
  alt={movie.title}
  width={200}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

**状态管理优化**

```javascript
// 使用 useMemo 优化计算
const filteredMovies = useMemo(() => {
  return movies.filter((movie) =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
}, [movies, searchTerm])

// 使用 useCallback 优化函数
const handleSearch = useCallback((term) => {
  setSearchTerm(term)
}, [])
```

### 3. 数据库优化

**索引优化**

```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_movie_year ON movie_corpus(year);
CREATE INDEX idx_movie_rating ON movie_corpus(rating_score);
CREATE INDEX idx_movie_title ON movie_corpus(title);

-- 为向量搜索添加索引
CREATE INDEX idx_movie_embedding ON movie_corpus(embedding)
USING ivfflat (vector_cosine_ops) WITH (lists = 100);
```

**查询优化**

```sql
-- 使用覆盖索引
SELECT id, title, year FROM movie_corpus
WHERE year = 2023 AND rating_score > 8.0;

-- 避免 SELECT *
SELECT id, title, year, rating_score FROM movie_corpus
WHERE year = 2023;
```

**连接池优化**

```javascript
// 调整连接池大小
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=20',
    },
  },
})
```

### 4. 混合搜索优化

**权重调优**

```javascript
// 根据查询类型动态调整权重
const getWeights = (query) => {
  if (query.length < 10) {
    return { vector: 0.3, keyword: 0.7 } // 短查询偏向关键词
  } else {
    return { vector: 0.7, keyword: 0.3 } // 长查询偏向语义
  }
}
```

**缓存策略**

```javascript
// 缓存向量计算结果
const vectorCache = new Map()
const getCachedVector = async (query) => {
  if (vectorCache.has(query)) {
    return vectorCache.get(query)
  }

  const vector = await generateEmbedding(query)
  vectorCache.set(query, vector)
  return vector
}
```

## 📈 监控和告警

### 1. 关键指标监控

**API 监控指标**

- 响应时间 (P50, P95, P99)
- 请求成功率
- 错误率
- 吞吐量 (QPS)

**数据库监控指标**

- 连接数
- 查询执行时间
- 慢查询数量
- 锁等待时间

**前端监控指标**

- Core Web Vitals
- 页面加载时间
- 用户交互响应时间
- 错误率

### 2. 告警设置

```javascript
// 性能告警配置
const alerts = {
  api: {
    responseTime: { threshold: 1000, unit: 'ms' },
    errorRate: { threshold: 5, unit: '%' },
    throughput: { threshold: 100, unit: 'qps' },
  },
  database: {
    connectionCount: { threshold: 80, unit: '%' },
    slowQueries: { threshold: 10, unit: 'count' },
  },
  frontend: {
    fcp: { threshold: 3000, unit: 'ms' },
    lcp: { threshold: 4000, unit: 'ms' },
  },
}
```

## 🚨 常见问题和解决方案

### 1. API 响应慢

**可能原因**：

- 数据库查询未优化
- 缺少必要的索引
- 网络延迟
- 服务器资源不足

**解决方案**：

- 分析慢查询日志
- 添加数据库索引
- 使用连接池
- 实施缓存策略

### 2. 前端加载慢

**可能原因**：

- 资源文件过大
- 未启用压缩
- 缺少 CDN
- 渲染阻塞资源

**解决方案**：

- 启用 Gzip 压缩
- 使用代码分割
- 优化图片资源
- 使用 CDN 加速

### 3. 混合搜索准确性低

**可能原因**：

- 权重配置不当
- 向量模型不匹配
- 数据质量问题
- 查询预处理不足

**解决方案**：

- 调整权重参数
- 更新向量模型
- 清洗训练数据
- 优化查询预处理

## 📝 测试报告模板

### 1. 执行摘要

- 测试目标
- 测试环境
- 测试结果概览
- 主要发现

### 2. 详细结果

- 各模块性能指标
- 性能趋势分析
- 瓶颈识别
- 优化建议

### 3. 行动计划

- 优先级排序
- 实施时间表
- 资源需求
- 预期效果

---

**记住：性能测试是一个持续的过程，需要定期执行并根据结果进行优化！** 🎯
