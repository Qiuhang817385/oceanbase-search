我来帮您分析当前项目并学习 Lighthouse 性能优化。让我先深入了解您的项目结构。

[7 tools called]

现在让我查看一些 API 路由文件来了解后端性能情况：

[3 tools called]

现在让我查看一些其他关键文件：

[3 tools called]

## 项目分析报告

作为专业的前端开发架构师，我来为您详细分析当前项目并提供 Lighthouse 性能优化方案。

### 1. 当前项目分析

**项目概况：**

- **技术栈**：Next.js 15.5.4 + React 19 + TypeScript + Ant Design + Tailwind CSS
- **项目类型**：电影混合搜索应用，支持向量搜索和混合搜索
- **架构特点**：多数据库架构（Prisma + OceanBase），支持 AI 嵌入搜索

**当前性能问题识别：**

```52:129:app/hybrid-search/ui/MovieSearchPage.tsx
export default function MovieSearchPage({}: MovieSearchPageProps) {
  const defaultQuery = '高评分电影'
  const [searchQuery, setSearchQuery] = useState(defaultQuery)
  const [vectorResults, setVectorResults] = useState<MovieData[]>([])
  const [hybridResults, setHybridResults] = useState<MovieData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 页面加载时自动执行一次搜索
  useEffect(() => {
    handleSearch()
  }, [])
```

**主要性能瓶颈：**

1. **首屏加载问题**：页面加载时立即执行搜索请求，阻塞首屏渲染
2. **重复 API 调用**：每次搜索同时调用两个 API（向量搜索+混合搜索）
3. **大量 DOM 渲染**：搜索结果直接渲染大量卡片组件
4. **图片加载**：虽然暂时屏蔽了图片，但仍有图片相关的代码
5. **内联样式过多**：大量内联样式影响 CSS 优化

### 2. Lighthouse 性能指标详解

**核心 Web 指标（Core Web Vitals）：**

- **LCP (Largest Contentful Paint)**：最大内容绘制时间，目标 < 2.5s
- **FID (First Input Delay)**：首次输入延迟，目标 < 100ms
- **CLS (Cumulative Layout Shift)**：累积布局偏移，目标 < 0.1

**其他重要指标：**

- **FCP (First Contentful Paint)**：首次内容绘制，目标 < 1.8s
- **SI (Speed Index)**：速度指数，目标 < 3.4s
- **TBT (Total Blocking Time)**：总阻塞时间，目标 < 200ms
- **TTI (Time to Interactive)**：可交互时间，目标 < 3.8s

### 3. 代码优化方案（目标 Lighthouse 95+）

#### 3.1 首屏加载优化

**问题**：页面加载时立即执行搜索，阻塞首屏渲染

**解决方案**：

```typescript
// 优化后的首屏加载策略
export default function MovieSearchPage() {
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    // 延迟执行初始搜索，让首屏先渲染
    const timer = setTimeout(() => {
      handleSearch()
      setIsInitialLoad(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // 首屏显示骨架屏而不是loading状态
  if (isInitialLoad) {
    return <SearchPageSkeleton />
  }
}
```

#### 3.2 API 调用优化

**问题**：并行调用两个 API，增加网络负担

**解决方案**：

```typescript
// 实现API请求缓存和去重
const useSearchCache = () => {
  const cache = useRef(new Map())

  const cachedSearch = useCallback(async (query: string) => {
    if (cache.current.has(query)) {
      return cache.current.get(query)
    }

    const result = await performSearch(query)
    cache.current.set(query, result)
    return result
  }, [])

  return { cachedSearch }
}
```

#### 3.3 组件懒加载和虚拟化

**问题**：大量搜索结果一次性渲染

**解决方案**：

```typescript
// 使用React.lazy和Suspense进行组件懒加载
const MovieCard = lazy(() => import('./MovieCard'))

// 实现虚拟滚动
import { FixedSizeList as List } from 'react-window'

const VirtualizedResults = ({ items }) => (
  <List height={600} itemCount={items.length} itemSize={200} itemData={items}>
    {({ index, style, data }) => (
      <div style={style}>
        <MovieCard movie={data[index]} />
      </div>
    )}
  </List>
)
```

#### 3.4 图片优化

**问题**：图片加载影响性能

**解决方案**：

```typescript
// 使用Next.js Image组件优化
import Image from 'next/image'

const OptimizedMovieImage = ({ src, alt }) => (
  <Image
    src={src}
    alt={alt}
    width={120}
    height={180}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
    loading="lazy"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
)
```

#### 3.5 CSS 优化

**问题**：内联样式过多，影响 CSS 优化

**解决方案**：

```typescript
// 将内联样式提取到CSS模块或styled-components
// styles/MovieSearchPage.module.css
.searchContainer {
  padding: 24px;
  background-color: #fafafa;
  min-height: 100vh;
}

.resultCard {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

// 使用CSS-in-JS优化
import styled from 'styled-components'

const SearchContainer = styled.div`
  padding: 24px;
  background-color: #fafafa;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 16px;
  }
`
```

#### 3.6 数据库查询优化

**问题**：API 响应时间过长

**解决方案**：

```typescript
// 在API路由中添加缓存和优化
export async function POST(request: NextRequest) {
  // 添加请求去重
  const requestId = generateRequestId(request)
  if (isRequestInProgress(requestId)) {
    return await waitForRequest(requestId)
  }

  // 添加Redis缓存
  const cacheKey = `search:${query}:${limit}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return NextResponse.json(JSON.parse(cached))
  }

  // 执行搜索并缓存结果
  const result = await performSearch(query, limit)
  await redis.setex(cacheKey, 300, JSON.stringify(result)) // 5分钟缓存

  return NextResponse.json(result)
}


// API 路由中的 Redis 缓存
export async function POST(request: NextRequest) {
  const { query, limit = 10 } = await request.json()
  
  // Redis 缓存键
  const cacheKey = `search:${query}:${limit}`
  
  try {
    // 尝试从 Redis 获取缓存
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(JSON.parse(cached))
    }
    
    // 执行搜索
    const result = await performSearch(query, limit)
    
    // 缓存到 Redis（5分钟过期）
    await redis.setex(cacheKey, 300, JSON.stringify(result))
    
    return NextResponse.json(result)
  } catch (error) {
    // Redis 故障时的降级处理
    const result = await performSearch(query, limit)
    return NextResponse.json(result)
  }
}
```

#### 3.7 Bundle 优化

**问题**：JavaScript 包过大

**解决方案**：

```typescript
// next.config.ts 优化配置
const nextConfig: NextConfig = {
  // 启用压缩
  compress: true,

  // 优化图片
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // 实验性功能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['antd', '@ant-design/icons'],
  },

  // Webpack优化
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          antd: {
            test: /[\\/]node_modules[\\/]antd[\\/]/,
            name: 'antd',
            chunks: 'all',
          },
        },
      }
    }
    return config
  },
}
```

#### 3.8 预加载和预连接

**解决方案**：

```typescript
// 在layout.tsx中添加资源提示
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://img1.doubanio.com" />
        <link rel="dns-prefetch" href="https://img9.doubanio.com" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### 4. 具体实施步骤

**第一阶段：基础优化（预期提升 20-30 分）**

1. 移除首屏自动搜索
2. 添加骨架屏组件
3. 优化 CSS，减少内联样式
4. 启用 Next.js 压缩和图片优化

**第二阶段：性能优化（预期提升 15-25 分）**

1. 实现 API 缓存机制
2. 添加组件懒加载
3. 优化 Bundle 分割
4. 实现虚拟滚动

**第三阶段：高级优化（预期提升 10-15 分）**

1. 添加 Service Worker 缓存
2. 实现预加载策略
3. 优化数据库查询
4. 添加性能监控

### 5. 监控和测量

**推荐工具：**

- **Lighthouse CI**：自动化性能测试
- **Web Vitals**：实时性能监控
- **Bundle Analyzer**：包大小分析
- **React DevTools Profiler**：组件性能分析

通过以上优化方案，您的项目 Lighthouse 性能评分有望从当前水平提升至 95+。建议按阶段实施，每个阶段完成后重新测试 Lighthouse 评分，确保优化效果。
