# Prisma 原生 SQL 查询演示项目

## 项目概述

这个项目演示了如何在 Next.js 应用中使用 Prisma 进行原生 SQL 查询。包含了多种查询类型的完整示例和可视化界面。

## 文件结构

```
├── app/
│   ├── api/
│   │   └── test_movies/
│   │       ├── route.ts          # 主要的 API 路由，包含所有原生 SQL 查询示例
│   │       └── README.md         # API 使用说明文档
│   └── test-movies-demo/
│       └── page.tsx              # 可视化演示页面
├── lib/
│   └── prisma.ts                 # Prisma 客户端配置
├── prisma/
│   └── schema.prisma             # 数据库模式定义
├── test-prisma-sql.js            # 测试脚本
└── PRISMA_SQL_DEMO.md            # 项目说明文档
```

## 功能特性

### 1. 预定义查询类型

- **基础查询** (`basic`): 简单的 SELECT 查询
- **聚合查询** (`aggregate`): 使用 GROUP BY 和聚合函数
- **JSON 查询** (`json`): 处理 MySQL JSON 字段
- **复杂查询** (`complex`): 复杂的多表关联和分组查询
- **搜索查询** (`search`): 全文搜索功能
- **分页查询** (`pagination`): 分页数据查询
- **统计查询** (`stats`): 数据库统计信息

### 2. 自定义 SQL 执行

- 支持通过 POST 请求执行自定义 SQL
- 参数化查询防止 SQL 注入
- 自动识别查询类型（SELECT vs INSERT/UPDATE/DELETE）

### 3. 可视化界面

- React 组件提供友好的用户界面
- 实时查询结果展示
- 错误处理和加载状态

## 使用方法

### 1. 启动开发服务器

```bash
npm run dev
# 或
pnpm dev
```

### 2. 访问演示页面

打开浏览器访问: `http://localhost:3000/test-movies-demo`

### 3. 测试 API 端点

#### 预定义查询示例

```bash
# 基础查询
curl "http://localhost:3000/api/test_movies?type=basic"

# 聚合查询
curl "http://localhost:3000/api/test_movies?type=aggregate"

# JSON 查询
curl "http://localhost:3000/api/test_movies?type=json"

# 搜索查询
curl "http://localhost:3000/api/test_movies?type=search&search=复仇者"

# 分页查询
curl "http://localhost:3000/api/test_movies?type=pagination&page=1&limit=5"
```

#### 自定义 SQL 示例

```bash
# 查询操作
curl -X POST "http://localhost:3000/api/test_movies" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM movie_corpus WHERE year >= 2020 LIMIT 5",
    "params": []
  }'

# 带参数的查询
curl -X POST "http://localhost:3000/api/test_movies" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM movie_corpus WHERE year = ? AND rating_score > ?",
    "params": [2020, 8.0]
  }'
```

### 4. 运行测试脚本

```bash
node test-prisma-sql.js
```

## Prisma 原生 SQL 方法详解

### 1. `$queryRaw` - 模板字符串查询（推荐）

```typescript
// 安全的模板字符串查询
const result = await prisma.$queryRaw`
  SELECT * FROM movie_corpus 
  WHERE year = ${year} 
  AND rating_score > ${minRating}
`
```

**优点:**

- 类型安全
- 自动参数化
- 防止 SQL 注入
- 支持 TypeScript 类型推断

### 2. `$queryRawUnsafe` - 字符串查询

```typescript
// 直接字符串查询
const result = await prisma.$queryRawUnsafe(
  'SELECT * FROM movie_corpus WHERE year = ? AND rating_score > ?',
  year,
  minRating
)
```

**使用场景:**

- 动态构建复杂 SQL
- 需要运行时决定查询结构
- 从外部来源接收 SQL

### 3. `$executeRaw` - 执行操作（模板字符串）

```typescript
// 执行 INSERT, UPDATE, DELETE 操作
const result = await prisma.$executeRaw`
  UPDATE movie_corpus 
  SET rating_score = ${newRating} 
  WHERE id = ${movieId}
`
```

### 4. `$executeRawUnsafe` - 执行操作（字符串）

```typescript
// 执行操作（字符串形式）
const result = await prisma.$executeRawUnsafe(
  'UPDATE movie_corpus SET rating_score = ? WHERE id = ?',
  newRating,
  movieId
)
```

## 数据库模式

项目使用 MySQL 数据库，主要表结构：

```sql
-- movie_corpus 表
CREATE TABLE movie_corpus (
  id VARCHAR(4096),
  component_code INT,
  movie_id INT,
  title VARCHAR(500),
  original_title VARCHAR(500),
  year INT,
  countries JSON,
  languages JSON,
  genres JSON,
  directors JSON,
  actors JSON,
  summary TEXT,
  rating_score FLOAT,
  rating_count INT,
  -- ... 其他字段
  PRIMARY KEY (id, component_code)
);
```

## 安全最佳实践

1. **优先使用模板字符串**: `$queryRaw` 比 `$queryRawUnsafe` 更安全
2. **参数化查询**: 始终使用参数化查询防止 SQL 注入
3. **输入验证**: 在执行前验证所有用户输入
4. **权限控制**: 限制原生 SQL 的执行权限
5. **错误处理**: 不要暴露敏感的数据库错误信息

## 性能优化建议

1. **索引优化**: 为常用查询字段添加索引
2. **查询优化**: 使用 EXPLAIN 分析查询性能
3. **连接池**: 配置适当的数据库连接池
4. **缓存**: 对频繁查询的结果进行缓存
5. **分页**: 对大数据集使用分页查询

## 常见问题

### Q: 什么时候使用原生 SQL？

A: 当 Prisma ORM 无法满足复杂查询需求时，如：

- 复杂的聚合查询
- 跨表关联查询
- 数据库特定功能（如 MySQL JSON 函数）
- 性能要求极高的查询

### Q: 如何确保 SQL 注入安全？

A:

- 优先使用 `$queryRaw` 模板字符串
- 使用参数化查询
- 验证和清理用户输入
- 避免字符串拼接构建 SQL

### Q: 原生 SQL 查询结果如何类型化？

A:

```typescript
// 定义结果类型
interface MovieResult {
  id: string
  title: string
  year: number
  rating_score: number
}

// 使用类型断言
const result = await prisma.$queryRaw<MovieResult[]>`
  SELECT id, title, year, rating_score 
  FROM movie_corpus 
  WHERE year >= 2020
`
```

## 扩展功能

可以考虑添加的功能：

1. **查询历史记录**: 保存和查看执行过的查询
2. **查询性能分析**: 显示查询执行时间
3. **SQL 语法高亮**: 在界面中高亮显示 SQL 语法
4. **查询模板**: 提供常用查询的模板
5. **导出功能**: 将查询结果导出为 CSV/JSON

## 总结

这个演示项目完整展示了 Prisma 原生 SQL 查询的各种用法，包括：

- ✅ 7 种不同类型的预定义查询示例
- ✅ 自定义 SQL 执行功能
- ✅ 可视化用户界面
- ✅ 完整的错误处理
- ✅ 安全最佳实践
- ✅ 详细的文档说明

通过这些示例，你可以快速掌握如何在 Prisma 中使用原生 SQL 查询，并根据实际需求进行扩展和优化。
