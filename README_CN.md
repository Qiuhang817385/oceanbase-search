# OceanBase 多数据库向量搜索系统

一个基于 Next.js 和 Prisma 的多数据库向量搜索应用，支持电影数据的智能搜索和推荐。

## 🚀 功能特性

- **多数据库支持**: 支持连接多个 OceanBase 数据库进行联合搜索
- **向量搜索**: 基于百炼 Embeddings 的语义相似度搜索
- **混合搜索**: 结合向量搜索和关键词搜索的智能混合查询
- **全文搜索**: 基于数据库全文索引的高性能文本搜索
- **文本分词**: 支持文本分词和标记化处理
- **动态路由**: 支持电影详情页的动态路由访问
- **现代化 UI**: 基于 Ant Design 的响应式界面设计
- **实时搜索**: 支持实时搜索和结果展示

## 🛠️ 技术栈

- **前端**: Next.js 15, React 19, Ant Design, TypeScript
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: OceanBase (MySQL 兼容)
- **向量搜索**: 百炼 Embeddings API

## 📋 环境要求

- Node.js 18+
- npm/yarn/pnpm
- OceanBase 数据库访问权限
- OceanBase 数据库（支持混搜 4.1 版本及以上）

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
│   │   ├── full-text-search/     # 全文搜索 API
│   │   ├── multi-hybrid-search/  # 多数据库混合搜索 API
│   │   ├── tokenize/             # 文本分词 API
│   │   └── vector-search/        # 向量搜索 API
│   ├── component/                # 组件目录
│   │   ├── MovieCard/            # 电影卡片组件
│   │   ├── OptimizedMovieImage/  # 优化图片组件
│   │   └── SettingModal/        # 设置模态框组件
│   ├── hybrid-search/            # 混合搜索页面
│   │   ├── [id]/                 # 电影详情页（动态路由）
│   │   │   ├── page.tsx          # 详情页入口
│   │   │   └── ui/                # 详情页 UI 组件
│   │   ├── page.tsx              # 搜索页入口
│   │   └── ui/                   # 搜索页 UI 组件
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
├── lib/                          # 工具库
│   ├── hooks/                    # React Hooks
│   │   ├── useMovieSearch.ts     # 电影搜索 Hook
│   │   └── useSyncURLState.ts    # URL 状态同步 Hook
│   ├── multi-prisma.ts          # 多数据库管理
│   ├── prisma.ts                # Prisma 客户端
│   ├── movies.ts                # 电影数据处理
│   └── utils/                    # 工具函数
│       └── searchParams.ts       # 搜索参数处理
├── middleware/                   # 中间件
│   ├── model.js                  # 模型初始化
│   └── models/                   # 模型定义
│       ├── index.js              # 模型导出
│       └── openai.js             # OpenAI 模型配置
├── prisma/                       # 数据库配置
│   └── schema.prisma            # 数据库模式
├── constants/                    # 常量定义
│   └── index.ts                 # 常量导出
├── public/                       # 静态资源
└── README.md                    # 项目说明
```

## 🔍 API 接口

### 多数据库混合搜索

多数据库混合搜索接口，支持向量搜索和关键词搜索的混合查询。

```http
POST /api/multi-hybrid-search
Content-Type: application/json

{
  "query": "搜索关键词",
  "limit": 10,
  "hybridRadio": 0.7,
  "tableName": "movies_with_rating"
}
```

**参数说明**:

- `query` (必填): 搜索关键词
- `limit` (可选): 返回结果数量，默认 10，最大 20
- `hybridRadio` (可选): 混合搜索权重比例，默认 0.7（向量搜索权重）
- `tableName` (可选): 数据表名称，默认 "movies_with_rating"

### 向量搜索

纯向量搜索接口，基于语义相似度进行搜索。

```http
POST /api/vector-search
Content-Type: application/json

{
  "query": "搜索关键词",
  "limit": 10,
  "tableName": "movies_with_rating"
}
```

**参数说明**:

- `query` (必填): 搜索关键词
- `limit` (可选): 返回结果数量，默认 10，最大 20
- `tableName` (可选): 数据表名称，默认 "movies_with_rating"

### 全文搜索

基于数据库全文索引的文本搜索接口。

```http
POST /api/full-text-search
Content-Type: application/json

{
  "query": "搜索关键词",
  "limit": 10,
  "tableName": "movies_with_rating"
}
```

**参数说明**:

- `query` (必填): 搜索关键词
- `limit` (可选): 返回结果数量，默认 10，最大 20
- `tableName` (可选): 数据表名称，默认 "movies_with_rating"

### 文本分词

文本分词接口，用于文本处理和标记化。

```http
POST /api/tokenize
Content-Type: application/json

{
  "query": "需要分词的文本"
}
```

**参数说明**:

- `query` (必填): 需要分词的文本内容

## 🎯 使用说明

### 页面路由

- **首页** (`/`): 项目入口页面
- **混合搜索页** (`/hybrid-search`): 电影搜索主页面，支持多种搜索方式
- **电影详情页** (`/hybrid-search/[id]`): 电影详细信息页面，通过动态路由访问

### 搜索功能

1. **多数据库混合搜索**: 在搜索页面输入关键词，系统会进行向量搜索和关键词搜索的混合查询
2. **向量搜索**: 基于语义相似度的纯向量搜索
3. **全文搜索**: 基于数据库全文索引的文本搜索
4. **结果展示**: 搜索结果以卡片形式展示，包含电影海报、标题、评分等信息
5. **相似度评分**: 每个结果都会显示相似度评分和进度条
6. **智能降级**: 如果向量搜索失败，系统会自动降级到文本搜索
7. **详情查看**: 点击搜索结果卡片可跳转到电影详情页查看完整信息

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
