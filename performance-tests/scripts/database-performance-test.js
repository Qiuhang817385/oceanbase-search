const mysql = require('mysql2/promise');
const { performance } = require('perf_hooks');
const cliProgress = require('cli-progress');
const chalk = require('chalk');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'oceanbase_search',
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000
};

// 测试查询
const testQueries = [
  {
    name: '基础分页查询',
    sql: 'SELECT * FROM movie_corpus ORDER BY rating_score DESC LIMIT ? OFFSET ?',
    params: [10, 0]
  },
  {
    name: '标题搜索',
    sql: 'SELECT * FROM movie_corpus WHERE title LIKE ? LIMIT ?',
    params: ['%复仇者%', 10]
  },
  {
    name: '年份过滤',
    sql: 'SELECT * FROM movie_corpus WHERE year = ? ORDER BY rating_score DESC LIMIT ?',
    params: [2023, 10]
  },
  {
    name: '类型过滤',
    sql: 'SELECT * FROM movie_corpus WHERE JSON_CONTAINS(genres, ?) LIMIT ?',
    params: ['"动作"', 10]
  },
  {
    name: '复合查询',
    sql: 'SELECT * FROM movie_corpus WHERE year = ? AND JSON_CONTAINS(genres, ?) ORDER BY rating_score DESC LIMIT ?',
    params: [2023, '"科幻"', 10]
  },
  {
    name: '统计查询',
    sql: 'SELECT COUNT(*) as total FROM movie_corpus WHERE year >= ?',
    params: [2020]
  },
  {
    name: '向量相似性查询',
    sql: 'SELECT id, title, VECTOR_DISTANCE(embedding, JSON_ARRAY(0.1, 0.2, 0.3, 0.4, 0.5)) as distance FROM movie_corpus WHERE embedding IS NOT NULL ORDER BY distance ASC LIMIT ?',
    params: [10]
  }
];

class DatabasePerformanceTester {
  constructor() {
    this.pool = null;
    this.results = [];
  }

  async connect () {
    try {
      this.pool = mysql.createPool(dbConfig);
      console.log(chalk.green('✅ 数据库连接成功'));

      // 测试连接
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      return true;
    } catch (error) {
      console.log(chalk.red(`❌ 数据库连接失败: ${error.message}`));
      return false;
    }
  }

  async disconnect () {
    if (this.pool) {
      await this.pool.end();
      console.log(chalk.blue('🔌 数据库连接已关闭'));
    }
  }

  async executeQuery (query, iterations = 10) {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      try {
        const [rows] = await this.pool.execute(query.sql, query.params);
        const endTime = performance.now();

        results.push({
          success: true,
          responseTime: endTime - startTime,
          rowCount: Array.isArray(rows) ? rows.length : 0,
          query: query.name
        });
      } catch (error) {
        const endTime = performance.now();
        results.push({
          success: false,
          responseTime: endTime - startTime,
          error: error.message,
          query: query.name
        });
      }
    }

    return results;
  }

  async runSingleQueryTest (query) {
    console.log(chalk.blue(`\n🔍 测试查询: ${query.name}`));
    console.log(chalk.gray(`SQL: ${query.sql}`));

    const results = await this.executeQuery(query, 10);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      const responseTimes = successful.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const minResponseTime = Math.min(...responseTimes);
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      const result = {
        query: query.name,
        successRate: (successful.length / results.length) * 100,
        avgResponseTime: Math.round(avgResponseTime),
        minResponseTime: Math.round(minResponseTime),
        maxResponseTime: Math.round(maxResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        rowCount: successful[0]?.rowCount || 0,
        errors: failed.map(f => f.error)
      };

      this.results.push(result);

      console.log(chalk.green(`✅ 成功率: ${result.successRate.toFixed(1)}%`));
      console.log(chalk.yellow(`⏱️  平均响应时间: ${result.avgResponseTime}ms`));
      console.log(chalk.cyan(`📊 响应时间范围: ${result.minResponseTime}ms - ${result.maxResponseTime}ms`));
      console.log(chalk.magenta(`📈 P95 响应时间: ${result.p95ResponseTime}ms`));
      console.log(chalk.blue(`📋 返回行数: ${result.rowCount}`));

      if (failed.length > 0) {
        console.log(chalk.red(`❌ 失败次数: ${failed.length}`));
        failed.forEach(f => {
          console.log(chalk.red(`   - ${f.error}`));
        });
      }
    } else {
      console.log(chalk.red(`❌ 所有查询都失败了`));
      failed.forEach(f => {
        console.log(chalk.red(`   - ${f.error}`));
      });
    }
  }

  async runConcurrentTest () {
    console.log(chalk.bold.blue('\n⚡ 并发查询测试'));
    console.log(chalk.gray('='.repeat(50)));

    const concurrentLevels = [5, 10, 20, 50];
    const testQuery = testQueries[0]; // 使用基础分页查询

    for (const concurrency of concurrentLevels) {
      console.log(chalk.blue(`\n🔄 并发级别: ${concurrency}`));

      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < concurrency; i++) {
        promises.push(this.executeQuery(testQuery, 1));
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();

      const allResults = results.flat();
      const successful = allResults.filter(r => r.success);
      const failed = allResults.filter(r => !r.success);

      const totalTime = endTime - startTime;
      const throughput = (successful.length / totalTime) * 1000; // 查询/秒
      const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;

      console.log(chalk.green(`✅ 成功率: ${(successful.length / allResults.length * 100).toFixed(1)}%`));
      console.log(chalk.yellow(`⏱️  平均响应时间: ${Math.round(avgResponseTime)}ms`));
      console.log(chalk.cyan(`📊 吞吐量: ${Math.round(throughput)} 查询/秒`));
      console.log(chalk.magenta(`⏰ 总时间: ${Math.round(totalTime)}ms`));

      if (failed.length > 0) {
        console.log(chalk.red(`❌ 失败查询: ${failed.length}`));
      }

      // 短暂休息
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async runConnectionPoolTest () {
    console.log(chalk.bold.blue('\n🏊 连接池性能测试'));
    console.log(chalk.gray('='.repeat(50)));

    const poolSizes = [5, 10, 20, 50];
    const testQuery = testQueries[0];

    for (const poolSize of poolSizes) {
      console.log(chalk.blue(`\n🏊 连接池大小: ${poolSize}`));

      // 创建新的连接池
      const testPool = mysql.createPool({
        ...dbConfig,
        connectionLimit: poolSize
      });

      const startTime = performance.now();
      const promises = [];

      // 创建并发查询
      for (let i = 0; i < poolSize; i++) {
        promises.push(
          testPool.execute(testQuery.sql, testQuery.params)
            .then(([rows]) => ({ success: true, rowCount: rows.length }))
            .catch(error => ({ success: false, error: error.message }))
        );
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const totalTime = endTime - startTime;

      console.log(chalk.green(`✅ 成功率: ${(successful.length / results.length * 100).toFixed(1)}%`));
      console.log(chalk.yellow(`⏱️  总执行时间: ${Math.round(totalTime)}ms`));
      console.log(chalk.cyan(`📊 平均每查询: ${Math.round(totalTime / results.length)}ms`));

      if (failed.length > 0) {
        console.log(chalk.red(`❌ 失败查询: ${failed.length}`));
      }

      // 关闭测试连接池
      await testPool.end();

      // 短暂休息
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async runIndexAnalysis () {
    console.log(chalk.bold.blue('\n📊 索引分析'));
    console.log(chalk.gray('='.repeat(50)));

    try {
      // 分析表结构
      const [tableInfo] = await this.pool.execute('SHOW CREATE TABLE movie_corpus');
      console.log(chalk.blue('\n📋 表结构信息:'));
      console.log(chalk.gray(tableInfo[0]['Create Table']));

      // 分析索引
      const [indexInfo] = await this.pool.execute('SHOW INDEX FROM movie_corpus');
      console.log(chalk.blue('\n🔍 索引信息:'));
      indexInfo.forEach(index => {
        console.log(chalk.white(`- ${index.Key_name}: ${index.Column_name} (${index.Index_type})`));
      });

      // 表统计信息
      const [tableStats] = await this.pool.execute(`
        SELECT 
          TABLE_ROWS,
          DATA_LENGTH,
          INDEX_LENGTH,
          (DATA_LENGTH + INDEX_LENGTH) as TOTAL_SIZE
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'movie_corpus'
      `, [dbConfig.database]);

      if (tableStats.length > 0) {
        const stats = tableStats[0];
        console.log(chalk.blue('\n📈 表统计信息:'));
        console.log(chalk.white(`- 行数: ${stats.TABLE_ROWS}`));
        console.log(chalk.white(`- 数据大小: ${(stats.DATA_LENGTH / 1024 / 1024).toFixed(2)} MB`));
        console.log(chalk.white(`- 索引大小: ${(stats.INDEX_LENGTH / 1024 / 1024).toFixed(2)} MB`));
        console.log(chalk.white(`- 总大小: ${(stats.TOTAL_SIZE / 1024 / 1024).toFixed(2)} MB`));
      }

    } catch (error) {
      console.log(chalk.red(`❌ 索引分析失败: ${error.message}`));
    }
  }

  printSummary () {
    console.log(chalk.bold.blue('\n📊 数据库性能测试总结'));
    console.log(chalk.gray('='.repeat(50)));

    if (this.results.length === 0) {
      console.log(chalk.yellow('⚠️  没有可用的测试结果'));
      return;
    }

    const overallSuccessRate = this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length;
    const overallAvgResponseTime = this.results.reduce((sum, r) => sum + r.avgResponseTime, 0) / this.results.length;

    console.log(chalk.green(`🎯 总体成功率: ${overallSuccessRate.toFixed(1)}%`));
    console.log(chalk.yellow(`⏱️  平均响应时间: ${Math.round(overallAvgResponseTime)}ms`));

    console.log(chalk.bold.blue('\n📋 详细结果:'));
    this.results.forEach((result, index) => {
      console.log(chalk.white(`${index + 1}. ${result.query}`));
      console.log(chalk.gray(`   成功率: ${result.successRate.toFixed(1)}% | 响应时间: ${result.avgResponseTime}ms | P95: ${result.p95ResponseTime}ms`));
    });

    // 性能建议
    this.printPerformanceRecommendations();
  }

  printPerformanceRecommendations () {
    console.log(chalk.bold.blue('\n💡 数据库优化建议:'));

    const slowQueries = this.results.filter(r => r.avgResponseTime > 1000);
    const lowSuccessQueries = this.results.filter(r => r.successRate < 95);

    if (slowQueries.length > 0) {
      console.log(chalk.yellow('⚠️  响应时间较慢的查询:'));
      slowQueries.forEach(query => {
        console.log(chalk.yellow(`   - ${query.query}: ${query.avgResponseTime}ms`));
      });
      console.log(chalk.gray('   建议: 添加索引、优化查询语句、考虑分页优化'));
    }

    if (lowSuccessQueries.length > 0) {
      console.log(chalk.red('❌ 成功率较低的查询:'));
      lowSuccessQueries.forEach(query => {
        console.log(chalk.red(`   - ${query.query}: ${query.successRate.toFixed(1)}%`));
      });
      console.log(chalk.gray('   建议: 检查数据库连接、优化资源使用、增加错误处理'));
    }

    // 通用建议
    console.log(chalk.blue('\n🔧 通用优化建议:'));
    console.log(chalk.gray('1. 为常用查询字段添加索引'));
    console.log(chalk.gray('2. 优化 JSON 字段查询（考虑使用虚拟列）'));
    console.log(chalk.gray('3. 调整连接池大小以匹配负载'));
    console.log(chalk.gray('4. 考虑使用查询缓存'));
    console.log(chalk.gray('5. 定期分析表统计信息'));

    if (slowQueries.length === 0 && lowSuccessQueries.length === 0) {
      console.log(chalk.green('🎉 数据库性能表现良好！'));
    }
  }

  async runAllTests () {
    console.log(chalk.bold.blue('🚀 开始数据库性能测试'));
    console.log(chalk.gray(`数据库: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`));
    console.log(chalk.gray(`测试时间: ${new Date().toLocaleString()}`));

    const connected = await this.connect();
    if (!connected) {
      return;
    }

    try {
      // 运行各种测试
      await this.runIndexAnalysis();

      for (const query of testQueries) {
        await this.runSingleQueryTest(query);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await this.runConcurrentTest();
      await this.runConnectionPoolTest();

      this.printSummary();
    } finally {
      await this.disconnect();
    }
  }
}

// 运行测试
async function main () {
  const tester = new DatabasePerformanceTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabasePerformanceTester;
