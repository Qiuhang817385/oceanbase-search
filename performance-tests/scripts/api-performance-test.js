const axios = require('axios');
const { performance } = require('perf_hooks');
const cliProgress = require('cli-progress');
const chalk = require('chalk');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = 10;
const TOTAL_REQUESTS = 100;

// 测试用例
const testCases = [
  {
    name: '基础电影列表查询',
    endpoint: '/api/movies',
    params: { page: 1, limit: 10 }
  },
  {
    name: '带搜索的电影查询',
    endpoint: '/api/movies',
    params: { page: 1, limit: 10, search: '复仇者' }
  },
  {
    name: '带年份过滤的查询',
    endpoint: '/api/movies',
    params: { page: 1, limit: 10, year: '2023' }
  },
  {
    name: '带类型过滤的查询',
    endpoint: '/api/movies',
    params: { page: 1, limit: 10, genre: '动作' }
  },
  {
    name: '混合搜索查询',
    endpoint: '/api/hybrid-search',
    method: 'POST',
    data: {
      query: '科幻电影',
      vectorWeight: 0.7,
      keywordWeight: 0.3,
      limit: 10
    }
  }
];

class APIPerformanceTester {
  constructor() {
    this.results = [];
  }

  async runSingleTest (testCase) {
    const startTime = performance.now();

    try {
      const config = {
        method: testCase.method || 'GET',
        url: `${BASE_URL}${testCase.endpoint}`,
        timeout: 30000
      };

      if (testCase.method === 'POST') {
        config.data = testCase.data;
        config.headers = { 'Content-Type': 'application/json' };
      } else {
        config.params = testCase.params;
      }

      const response = await axios(config);
      const endTime = performance.now();

      return {
        success: true,
        responseTime: endTime - startTime,
        statusCode: response.status,
        dataSize: JSON.stringify(response.data).length,
        testCase: testCase.name
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error.message,
        testCase: testCase.name
      };
    }
  }

  async runConcurrentTest (testCase, concurrentRequests = CONCURRENT_REQUESTS) {
    console.log(chalk.blue(`\n🧪 测试: ${testCase.name}`));
    console.log(chalk.gray(`并发请求数: ${concurrentRequests}`));

    const promises = [];
    const startTime = performance.now();

    // 创建进度条
    const progressBar = new cliProgress.SingleBar({
      format: '进度 |{bar}| {percentage}% | {value}/{total} 请求 | 平均响应时间: {avgTime}ms',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(concurrentRequests, 0, { avgTime: 0 });

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(this.runSingleTest(testCase));
    }

    const results = await Promise.all(promises);
    const endTime = performance.now();

    progressBar.stop();

    // 分析结果
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
    const totalTime = endTime - startTime;

    const result = {
      testCase: testCase.name,
      totalRequests: concurrentRequests,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / concurrentRequests) * 100,
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime: Math.min(...successful.map(r => r.responseTime)),
      maxResponseTime: Math.max(...successful.map(r => r.responseTime)),
      totalTime: Math.round(totalTime),
      throughput: Math.round((concurrentRequests / totalTime) * 1000), // 请求/秒
      errors: failed.map(f => f.error)
    };

    this.results.push(result);
    this.printTestResult(result);

    return result;
  }

  printTestResult (result) {
    console.log(chalk.green(`✅ 成功率: ${result.successRate.toFixed(1)}%`));
    console.log(chalk.yellow(`⏱️  平均响应时间: ${result.avgResponseTime}ms`));
    console.log(chalk.cyan(`📊 吞吐量: ${result.throughput} 请求/秒`));
    console.log(chalk.magenta(`📈 响应时间范围: ${result.minResponseTime}ms - ${result.maxResponseTime}ms`));

    if (result.failed > 0) {
      console.log(chalk.red(`❌ 失败请求: ${result.failed}`));
      result.errors.forEach(error => {
        console.log(chalk.red(`   - ${error}`));
      });
    }
  }

  async runAllTests () {
    console.log(chalk.bold.blue('🚀 开始 API 性能测试'));
    console.log(chalk.gray(`目标服务器: ${BASE_URL}`));
    console.log(chalk.gray(`测试时间: ${new Date().toLocaleString()}`));

    const startTime = performance.now();

    for (const testCase of testCases) {
      await this.runConcurrentTest(testCase);
      // 测试间隔
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const endTime = performance.now();
    this.printSummary(endTime - startTime);
  }

  printSummary (totalTime) {
    console.log(chalk.bold.blue('\n📊 测试总结'));
    console.log(chalk.gray('='.repeat(50)));

    const overallSuccessRate = this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length;
    const overallAvgResponseTime = this.results.reduce((sum, r) => sum + r.avgResponseTime, 0) / this.results.length;
    const overallThroughput = this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length;

    console.log(chalk.green(`🎯 总体成功率: ${overallSuccessRate.toFixed(1)}%`));
    console.log(chalk.yellow(`⏱️  平均响应时间: ${Math.round(overallAvgResponseTime)}ms`));
    console.log(chalk.cyan(`📊 平均吞吐量: ${Math.round(overallThroughput)} 请求/秒`));
    console.log(chalk.magenta(`⏰ 总测试时间: ${Math.round(totalTime)}ms`));

    console.log(chalk.bold.blue('\n📋 详细结果:'));
    this.results.forEach((result, index) => {
      console.log(chalk.white(`${index + 1}. ${result.testCase}`));
      console.log(chalk.gray(`   成功率: ${result.successRate.toFixed(1)}% | 响应时间: ${result.avgResponseTime}ms | 吞吐量: ${result.throughput} req/s`));
    });

    // 性能建议
    this.printPerformanceRecommendations();
  }

  printPerformanceRecommendations () {
    console.log(chalk.bold.blue('\n💡 性能优化建议:'));

    const slowTests = this.results.filter(r => r.avgResponseTime > 1000);
    const lowSuccessTests = this.results.filter(r => r.successRate < 95);

    if (slowTests.length > 0) {
      console.log(chalk.yellow('⚠️  响应时间较慢的接口:'));
      slowTests.forEach(test => {
        console.log(chalk.yellow(`   - ${test.testCase}: ${test.avgResponseTime}ms`));
      });
      console.log(chalk.gray('   建议: 检查数据库查询优化、添加缓存、考虑分页优化'));
    }

    if (lowSuccessTests.length > 0) {
      console.log(chalk.red('❌ 成功率较低的接口:'));
      lowSuccessTests.forEach(test => {
        console.log(chalk.red(`   - ${test.testCase}: ${test.successRate.toFixed(1)}%`));
      });
      console.log(chalk.gray('   建议: 检查错误日志、增加错误处理、优化资源使用'));
    }

    if (slowTests.length === 0 && lowSuccessTests.length === 0) {
      console.log(chalk.green('🎉 所有接口性能表现良好！'));
    }
  }
}

// 运行测试
async function main () {
  const tester = new APIPerformanceTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = APIPerformanceTester;
