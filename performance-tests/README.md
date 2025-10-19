# OceanBase Search 性能测试套件

这是一个专门为 OceanBase Search 项目设计的全面性能测试套件，包含前端、后端、数据库和混合搜索的性能测试。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd performance-tests
npm install
```

### 2. 环境配置

创建 `.env` 文件：

```env
# 服务器配置
BASE_URL=http://localhost:3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=oceanbase_search

# OpenAI API 配置（用于混合搜索测试）
OPENAI_API_KEY=your_openai_api_key
EMBEDDING_MODEL=text-embedding-v4
DIMENSIONS=1536
```

### 3. 运行测试

```bash
# 运行所有测试
npm run test:all

# 运行特定测试
npm run test:api              # API 性能测试
npm run test:hybrid-search    # 混合搜索测试
npm run test:database         # 数据库性能测试
npm run test:frontend         # 前端性能测试
npm run test:load             # 负载测试

# 启动实时监控
npm run monitor:start

# Lighthouse 性能审计
npm run lighthouse
```

## 📊 测试套件说明

### 1. API 性能测试 (`api-performance-test.js`)

测试所有 API 端点的性能指标：

- **基础电影查询**: 分页查询性能
- **搜索查询**: 关键词搜索性能
- **过滤查询**: 年份、类型过滤性能
- **混合搜索**: 向量+关键词混合搜索性能

**关键指标**:

- 响应时间 (平均、最小、最大、P95)
- 吞吐量 (请求/秒)
- 成功率
- 错误分析

### 2. 混合搜索测试 (`hybrid-search-test.js`)

专门测试混合搜索功能的性能和准确性：

- **搜索准确性测试**: 不同查询类型的搜索结果质量
- **性能测试**: 响应时间和并发处理能力
- **权重优化测试**: 不同权重组合的效果对比

**关键指标**:

- 搜索质量分数
- 混合结果占比
- 向量/关键词结果分布
- 权重优化建议

### 3. 数据库性能测试 (`database-performance-test.js`)

测试 OceanBase 数据库的性能：

- **查询性能**: 各种 SQL 查询的响应时间
- **并发测试**: 不同并发级别的处理能力
- **连接池测试**: 连接池大小对性能的影响
- **索引分析**: 数据库索引使用情况

**关键指标**:

- 查询响应时间
- 并发处理能力
- 连接池效率
- 索引使用率

### 4. 前端性能测试 (`frontend-performance-test.js`)

测试前端页面的性能：

- **页面加载性能**: Core Web Vitals 指标
- **交互性能**: 用户操作响应时间
- **内存使用**: JavaScript 堆内存监控
- **网络统计**: 资源加载分析

**关键指标**:

- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- 内存使用量

### 5. 负载测试 (`artillery-config.yml`)

使用 Artillery.js 进行高并发负载测试：

- **预热阶段**: 逐步增加负载
- **正常负载**: 模拟正常用户访问
- **高负载**: 测试系统承受能力
- **峰值负载**: 压力测试

### 6. 实时监控 (`performance-monitor.js`)

持续监控系统性能：

- **健康检查**: 定期检查 API 可用性
- **性能指标**: 实时响应时间和成功率
- **日志记录**: 详细的性能日志
- **报告生成**: 自动生成性能报告

## 📈 性能基准

### API 性能基准

| 接口类型 | 优秀     | 良好     | 需要优化 |
| -------- | -------- | -------- | -------- |
| 基础查询 | < 200ms  | < 500ms  | > 1000ms |
| 搜索查询 | < 300ms  | < 800ms  | > 1500ms |
| 混合搜索 | < 1000ms | < 2000ms | > 3000ms |

### 前端性能基准

| 指标 | 优秀    | 良好    | 需要优化 |
| ---- | ------- | ------- | -------- |
| FCP  | < 1.8s  | < 3.0s  | > 4.0s   |
| LCP  | < 2.5s  | < 4.0s  | > 6.0s   |
| FID  | < 100ms | < 300ms | > 500ms  |
| CLS  | < 0.1   | < 0.25  | > 0.5    |

### 数据库性能基准

| 查询类型 | 优秀    | 良好     | 需要优化 |
| -------- | ------- | -------- | -------- |
| 基础查询 | < 50ms  | < 100ms  | > 200ms  |
| 复杂查询 | < 200ms | < 500ms  | > 1000ms |
| 向量搜索 | < 500ms | < 1000ms | > 2000ms |

## 🔧 优化建议

### API 优化

1. **缓存策略**: 使用 Redis 缓存频繁查询的结果
2. **数据库优化**: 添加适当的索引，优化查询语句
3. **分页优化**: 使用游标分页替代偏移分页
4. **连接池**: 调整数据库连接池大小

### 前端优化

1. **代码分割**: 使用动态导入减少初始包大小
2. **图片优化**: 使用 Next.js 图片优化和懒加载
3. **缓存策略**: 合理使用 SWR 缓存
4. **渲染优化**: 使用 React.memo 和 useMemo

### 混合搜索优化

1. **权重调优**: 根据实际使用情况调整向量和关键词权重
2. **索引优化**: 为向量字段创建适当的索引
3. **批量处理**: 批量处理向量计算请求
4. **缓存策略**: 缓存常用查询的向量结果

## 📁 文件结构

```
performance-tests/
├── package.json                 # 依赖配置
├── README.md                   # 说明文档
├── artillery-config.yml        # 负载测试配置
├── scripts/
│   ├── api-performance-test.js     # API 性能测试
│   ├── hybrid-search-test.js       # 混合搜索测试
│   ├── database-performance-test.js # 数据库性能测试
│   ├── frontend-performance-test.js # 前端性能测试
│   └── performance-monitor.js      # 实时监控
├── logs/                       # 日志文件
└── reports/                    # 测试报告
```

## 🚨 注意事项

1. **测试环境**: 确保在测试环境中运行，避免影响生产环境
2. **资源监控**: 监控服务器资源使用情况，避免过载
3. **数据准备**: 确保测试数据库有足够的数据进行测试
4. **网络环境**: 在稳定的网络环境中进行测试
5. **并发控制**: 根据服务器配置调整并发测试参数

## 📞 支持

如果遇到问题或有改进建议，请：

1. 检查日志文件中的错误信息
2. 确认环境配置是否正确
3. 查看测试报告中的详细分析
4. 联系开发团队获取支持

---

**Happy Testing! 🎉**
