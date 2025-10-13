// 测试 Prisma 原生 SQL 查询的简单脚本
// 运行方式: node test-prisma-sql.js

const BASE_URL = 'http://localhost:3000'

async function testQuery (type, description) {
  console.log(`\n🧪 测试: ${description}`)
  console.log(`📡 请求: GET ${BASE_URL}/api/test_movies?type=${type}`)

  try {
    const response = await fetch(`${BASE_URL}/api/test_movies?type=${type}`)
    const data = await response.json()

    if (data.success) {
      console.log(`✅ 成功: ${data.queryType}`)
      console.log(`📊 数据条数: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`)
      console.log(`⏰ 时间: ${data.timestamp}`)

      // 显示部分数据
      if (Array.isArray(data.data) && data.data.length > 0) {
        console.log(`📋 示例数据:`, JSON.stringify(data.data[0], null, 2))
      } else if (data.data && typeof data.data === 'object') {
        console.log(`📋 数据结构:`, Object.keys(data.data))
      }
    } else {
      console.log(`❌ 失败: ${data.error}`)
    }
  } catch (error) {
    console.log(`💥 错误: ${error.message}`)
  }
}

async function testCustomSql () {
  console.log(`\n🧪 测试: 自定义 SQL 查询`)
  console.log(`📡 请求: POST ${BASE_URL}/api/test_movies`)

  const sqlData = {
    sql: "SELECT COUNT(*) as total FROM movie_corpus WHERE year >= 2020",
    params: []
  }

  try {
    const response = await fetch(`${BASE_URL}/api/test_movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sqlData)
    })

    const data = await response.json()

    if (data.success) {
      console.log(`✅ 成功: 自定义 SQL 执行`)
      console.log(`📊 结果:`, data.result)
      console.log(`⏰ 时间: ${data.timestamp}`)
    } else {
      console.log(`❌ 失败: ${data.error}`)
    }
  } catch (error) {
    console.log(`💥 错误: ${error.message}`)
  }
}

async function runTests () {
  console.log('🚀 开始测试 Prisma 原生 SQL 查询 API')
  console.log('=' * 50)

  // 测试各种预定义查询
  await testQuery('basic', '基础查询 - 2020年后高评分电影')
  await testQuery('aggregate', '聚合查询 - 按年份统计')
  await testQuery('json', 'JSON查询 - 动作类型电影')
  await testQuery('complex', '复杂查询 - 导演统计')
  await testQuery('search', '搜索查询 - 复仇者相关电影')
  await testQuery('pagination', '分页查询 - 分页电影列表')
  await testQuery('stats', '统计查询 - 数据库统计信息')

  // 测试自定义 SQL
  await testCustomSql()

  console.log('\n🎉 测试完成!')
  console.log('\n💡 提示:')
  console.log('- 访问 http://localhost:3000/test-movies-demo 查看可视化界面')
  console.log('- 查看 app/api/test_movies/README.md 了解详细用法')
}

// 检查是否在 Node.js 环境中运行
if (typeof fetch === 'undefined') {
  console.log('❌ 此脚本需要 Node.js 18+ 或安装 node-fetch')
  console.log('💡 或者直接在浏览器中访问 http://localhost:3000/test-movies-demo')
  process.exit(1)
}

runTests().catch(console.error)
