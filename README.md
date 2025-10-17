# OceanBase 多数据库向量搜索系统

一个基于 Next.js 和 Prisma 的多数据库向量搜索应用，支持电影数据的智能搜索和推荐。

## 🚀 功能特性

- **多数据库支持**: 同时连接主数据库和备用数据库
- **向量搜索**: 基于 OpenAI Embeddings 的语义搜索
- **混合搜索**: 结合向量搜索和关键词搜索
- **智能降级**: 向量搜索失败时自动降级到文本搜索
- **现代化 UI**: 基于 Ant Design 的响应式界面
- **实时搜索**: 支持实时搜索和结果展示

## 🛠️ 技术栈

- **前端**: Next.js 15, React 19, Ant Design, TypeScript
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: OceanBase (MySQL 兼容)
- **向量搜索**: OpenAI Embeddings API
- **状态管理**: SWR, ahooks

## 📋 环境要求

- Node.js 18+
- npm/yarn/pnpm
- OceanBase 数据库访问权限
- OpenAI API Key

## 🔧 安装和配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd oceanbase-search
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

创建 `.env` 文件并配置以下环境变量：

```env
# 数据库连接
DATABASE_URL="mysql://username:password@host:port/database"
DATABASE_URL_BACK="mysql://username:password@host:port/database"

# OpenAI 配置
OPENAI_API_KEY="your-openai-api-key"
EMBEDDING_PROVIDER="openai"
EMBEDDING_MODEL="text-embedding-v4"
DIMENSIONS="1024"
BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"

# 应用配置
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. 数据库设置

```bash
# 生成 Prisma 客户端
npm run setup

# 运行数据库迁移（如果需要）
npm run db:migrate
```

## 🚀 启动项目

### 开发环境

```bash
# 启动开发服务器（自动执行 Prisma 生成）
npm run dev

# 或者只启动服务器（不重新生成 Prisma）
npm run dev:only
```

### 生产环境

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
oceanbase-search/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── hybrid-search/        # 混合搜索 API
│   │   ├── multi-vector-search/  # 多数据库向量搜索 API
│   │   └── vector-search/        # 向量搜索 API
│   ├── hybrid-search/            # 混合搜索页面
│   └── page.tsx                  # 首页
├── lib/                          # 工具库
│   ├── multi-prisma.ts          # 多数据库管理
│   ├── prisma.ts                # Prisma 客户端
│   └── movies.ts                # 电影数据处理
├── prisma/                       # 数据库配置
│   └── schema.prisma            # 数据库模式
├── public/                       # 静态资源
└── README.md                    # 项目说明
```

## 🔍 API 接口

### 多数据库向量搜索

```http
POST /api/multi-vector-search
Content-Type: application/json

{
  "query": "搜索关键词",
  "limit": 10,
  "databases": ["main", "back"]
}
```

### 混合搜索

```http
POST /api/hybrid-search
Content-Type: application/json

{
  "query": "搜索关键词",
  "limit": 10,
  "vectorWeight": 0.7,
  "keywordWeight": 0.3
}
```

### 健康检查

```http
GET /api/multi-vector-search
```

## 🎯 使用说明

1. **搜索功能**: 在搜索框中输入关键词，系统会同时进行向量搜索和混合搜索
2. **结果展示**: 左侧显示多数据库向量搜索结果，右侧显示混合搜索结果
3. **相似度评分**: 每个结果都会显示相似度评分和进度条
4. **智能降级**: 如果向量搜索失败，系统会自动降级到文本搜索

## 🔧 开发指南

### 添加新的搜索类型

1. 在 `app/api/` 目录下创建新的 API 路由
2. 在 `lib/multi-prisma.ts` 中添加数据库连接管理
3. 更新前端页面以支持新的搜索类型

### 数据库模式更新

1. 修改 `prisma/schema.prisma`
2. 运行 `npm run setup` 重新生成客户端
3. 更新相关的 API 和前端代码

## 🐛 故障排除

### 常见问题

1. **Prisma 客户端未生成**

   ```bash
   npm run setup
   ```

2. **数据库连接失败**

   - 检查 `.env` 文件中的数据库连接字符串
   - 确认数据库服务是否正常运行

3. **向量搜索失败**

   - 检查 OpenAI API Key 是否正确
   - 确认 embedding 字段数据是否完整

4. **BigInt 序列化错误**
   - 系统已自动处理，如果仍有问题请检查数据格式

## 📝 更新日志

### v0.1.0

- 初始版本发布
- 支持多数据库向量搜索
- 实现混合搜索功能
- 添加智能降级机制

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至 [your-email@example.com]

---

**注意**: 请确保在生产环境中正确配置所有环境变量，并定期备份数据库。
