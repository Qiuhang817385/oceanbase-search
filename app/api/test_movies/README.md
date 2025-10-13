# Prisma 原生 SQL 查询示例

这个 API 端点演示了如何在 Prisma 中使用原生 SQL 查询。包含多种查询类型的示例。

## 使用方法

### GET 请求 - 预定义查询类型

访问 `/api/test_movies?type=<查询类型>` 来执行不同的查询：

#### 1. 基础查询 (`basic`)

```bash
GET /api/test_movies?type=basic
```

- 查询 2020 年后的高评分电影
- 使用简单的 SELECT 语句

#### 2. 聚合查询 (`aggregate`)

```bash
GET /api/test_movies?type=aggregate
```

- 按年份统计电影数量、平均评分等
- 使用 GROUP BY 和聚合函数

#### 3. JSON 字段查询 (`json`)

```bash
GET /api/test_movies?type=json
```

- 查询包含"动作"类型的电影
- 使用 MySQL JSON 函数处理 JSON 字段

#### 4. 复杂查询 (`complex`)

```bash
GET /api/test_movies?type=complex
```

- 统计高评分电影的导演信息
- 使用 JSON 函数和复杂的分组查询

#### 5. 搜索查询 (`search`)

```bash
GET /api/test_movies?type=search&search=复仇者
```

- 全文搜索电影标题、原名和简介
- 使用 LIKE 操作符进行模糊匹配

#### 6. 分页查询 (`pagination`)

```bash
GET /api/test_movies?type=pagination&page=1&limit=10
```

- 分页查询电影列表
- 包含总数统计

#### 7. 统计查询 (`stats`)

```bash
GET /api/test_movies?type=stats
```

- 获取电影数据库的统计信息
- 包含总体统计、年份统计和类型统计

### POST 请求 - 自定义 SQL 执行

发送 POST 请求到 `/api/test_movies` 来执行自定义 SQL：

```bash
POST /api/test_movies
Content-Type: application/json

{
  "sql": "SELECT * FROM movie_corpus WHERE year = ? LIMIT 5",
  "params": [2020]
}
```

## Prisma 原生 SQL 方法说明

### 1. `$queryRaw` - 模板字符串查询

```typescript
// 安全的模板字符串查询（推荐）
const result = await prisma.$queryRaw`
  SELECT * FROM movie_corpus 
  WHERE year = ${year} 
  AND rating_score > ${minRating}
`
```

### 2. `$queryRawUnsafe` - 不安全字符串查询

```typescript
// 直接字符串查询（需要手动处理参数）
const result = await prisma.$queryRawUnsafe(
  'SELECT * FROM movie_corpus WHERE year = ? AND rating_score > ?',
  year,
  minRating
)
```

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

## 安全注意事项

1. **优先使用模板字符串**：`$queryRaw` 和 `$executeRaw` 比 `Unsafe` 版本更安全
2. **参数化查询**：避免 SQL 注入，始终使用参数化查询
3. **输入验证**：在执行前验证用户输入
4. **权限控制**：确保只有授权用户可以执行原生 SQL

## 示例响应格式

```json
{
  "success": true,
  "queryType": "basic",
  "data": [
    {
      "id": "movie_123",
      "title": "电影标题",
      "year": 2020,
      "rating_score": 8.5,
      "rating_count": 1000
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 错误处理

API 会返回详细的错误信息：

```json
{
  "success": false,
  "error": "原生 SQL 查询失败",
  "details": "具体的错误信息"
}
```
