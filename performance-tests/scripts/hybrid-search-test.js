const axios = require('axios');
const { performance } = require('perf_hooks');
const cliProgress = require('cli-progress');
const chalk = require('chalk');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// 混合搜索测试用例
const hybridSearchTests = [
  {
    name: '简单关键词搜索',
    query: '复仇者',
    vectorWeight: 0.3,
    keywordWeight: 0.7,
    limit: 10
  },
  {
    name: '语义向量搜索',
    query: '科幻电影推荐',
    vectorWeight: 0.8,
    keywordWeight: 0.2,
    limit: 10
  },
  {
    name: '混合搜索平衡',
    query: '动作片英雄',
    vectorWeight: 0.5,
    keywordWeight: 0.5,
    limit: 10
  },
  {
    name: '复杂语义查询',
    query: '讲述时间旅行的科幻电影',
    vectorWeight: 0.9,
    keywordWeight: 0.1,
    limit: 20
  },
  {
    name: '带过滤条件的搜索',
    query: '2023年上映的电影',
    vectorWeight: 0.6,
    keywordWeight: 0.4,
    limit: 15,
    year: 2023
  }
];

class HybridSearchTester {
  constructor() {
    this.results = [];
  }

  async testSingleSearch (testCase) {
    const startTime = performance.now();

    try {
      const response = await axios.post(`${BASE_URL}/api/hybrid-search`, {
        query: testCase.query,
        vectorWeight: testCase.vectorWeight,
        keywordWeight: testCase.keywordWeight,
        limit: testCase.limit,
        year: testCase.year,
        genre: testCase.genre,
        minRating: testCase.minRating
      }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });

      const endTime = performance.now();

      return {
        success: true,
        responseTime: endTime - startTime,
        statusCode: response.status,
        data: response.data,
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

  async runSearchAccuracyTest () {
    console.log(chalk.bold.blue('\n🎯 混合搜索准确性测试'));
    console.log(chalk.gray('='.repeat(50)));

    for (const testCase of hybridSearchTests) {
      console.log(chalk.blue(`\n🔍 测试: ${testCase.name}`));
      console.log(chalk.gray(`查询: "${testCase.query}"`));
      console.log(chalk.gray(`权重: 向量${testCase.vectorWeight} | 关键词${testCase.keywordWeight}`));

      const result = await this.testSingleSearch(testCase);

      if (result.success) {
        const data = result.data.data;
        console.log(chalk.green(`✅ 搜索成功 (${result.responseTime.toFixed(0)}ms)`));
        console.log(chalk.cyan(`📊 结果数量: ${data.total}`));
        console.log(chalk.yellow(`🔢 搜索统计:`));
        console.log(chalk.gray(`   - 向量结果: ${data.searchStats.vectorResults}`));
        console.log(chalk.gray(`   - 关键词结果: ${data.searchStats.keywordResults}`));
        console.log(chalk.gray(`   - 混合结果: ${data.searchStats.combinedResults}`));

        // 显示前3个结果
        if (data.results.length > 0) {
          console.log(chalk.magenta(`🎬 前3个结果:`));
          data.results.slice(0, 3).forEach((movie, index) => {
            console.log(chalk.white(`   ${index + 1}. ${movie.title} (${movie.year})`));
            console.log(chalk.gray(`      混合分数: ${movie.hybridScore.toFixed(3)} | 类型: ${movie.searchType}`));
          });
        }

        this.results.push({
          ...result,
          accuracy: this.calculateSearchAccuracy(data.results),
          searchStats: data.searchStats
        });
      } else {
        console.log(chalk.red(`❌ 搜索失败: ${result.error}`));
        this.results.push(result);
      }

      // 测试间隔
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  calculateSearchAccuracy (results) {
    if (results.length === 0) return 0;

    // 计算混合搜索的准确性指标
    const hybridResults = results.filter(r => r.searchType === 'hybrid').length;
    const vectorResults = results.filter(r => r.searchType === 'vector').length;
    const keywordResults = results.filter(r => r.searchType === 'keyword').length;

    // 混合搜索的准确性 = 混合结果占比 + 结果质量分数
    const hybridRatio = hybridResults / results.length;
    const avgScore = results.reduce((sum, r) => sum + r.hybridScore, 0) / results.length;

    return {
      hybridRatio,
      avgScore,
      distribution: {
        hybrid: hybridResults,
        vector: vectorResults,
        keyword: keywordResults
      }
    };
  }

  async runPerformanceTest () {
    console.log(chalk.bold.blue('\n⚡ 混合搜索性能测试'));
    console.log(chalk.gray('='.repeat(50)));

    const testCase = {
      name: '性能测试查询',
      query: '科幻动作电影',
      vectorWeight: 0.7,
      keywordWeight: 0.3,
      limit: 10
    };

    const iterations = 20;
    const results = [];

    console.log(chalk.blue(`\n🔄 执行 ${iterations} 次搜索测试...`));

    const progressBar = new cliProgress.SingleBar({
      format: '进度 |{bar}| {percentage}% | {value}/{total} 次搜索 | 平均: {avgTime}ms',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(iterations, 0, { avgTime: 0 });

    for (let i = 0; i < iterations; i++) {
      const result = await this.testSingleSearch(testCase);
      results.push(result);

      const avgTime = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.success).length;

      progressBar.update(i + 1, { avgTime: Math.round(avgTime) });

      // 短暂延迟避免过载
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    progressBar.stop();

    // 分析性能结果
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      const responseTimes = successful.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const minResponseTime = Math.min(...responseTimes);
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      console.log(chalk.green(`\n✅ 性能测试完成`));
      console.log(chalk.yellow(`⏱️  平均响应时间: ${avgResponseTime.toFixed(0)}ms`));
      console.log(chalk.cyan(`📊 响应时间范围: ${minResponseTime.toFixed(0)}ms - ${maxResponseTime.toFixed(0)}ms`));
      console.log(chalk.magenta(`📈 P95 响应时间: ${p95ResponseTime.toFixed(0)}ms`));
      console.log(chalk.blue(`🎯 成功率: ${(successful.length / iterations * 100).toFixed(1)}%`));

      if (failed.length > 0) {
        console.log(chalk.red(`❌ 失败次数: ${failed.length}`));
      }
    }
  }

  async runWeightOptimizationTest () {
    console.log(chalk.bold.blue('\n⚖️  权重优化测试'));
    console.log(chalk.gray('='.repeat(50)));

    const testQuery = '科幻电影推荐';
    const weightCombinations = [
      { vector: 0.1, keyword: 0.9, name: '关键词主导' },
      { vector: 0.3, keyword: 0.7, name: '关键词偏重' },
      { vector: 0.5, keyword: 0.5, name: '平衡权重' },
      { vector: 0.7, keyword: 0.3, name: '向量偏重' },
      { vector: 0.9, keyword: 0.1, name: '向量主导' }
    ];

    const optimizationResults = [];

    for (const weights of weightCombinations) {
      console.log(chalk.blue(`\n🔬 测试权重组合: ${weights.name}`));
      console.log(chalk.gray(`向量权重: ${weights.vector} | 关键词权重: ${weights.keyword}`));

      const result = await this.testSingleSearch({
        name: weights.name,
        query: testQuery,
        vectorWeight: weights.vector,
        keywordWeight: weights.keyword,
        limit: 10
      });

      if (result.success) {
        const data = result.data.data;
        const accuracy = this.calculateSearchAccuracy(data.results);

        optimizationResults.push({
          weights,
          responseTime: result.responseTime,
          resultCount: data.total,
          accuracy,
          searchStats: data.searchStats
        });

        console.log(chalk.green(`✅ 响应时间: ${result.responseTime.toFixed(0)}ms`));
        console.log(chalk.cyan(`📊 结果数量: ${data.total}`));
        console.log(chalk.yellow(`🎯 混合比例: ${(accuracy.hybridRatio * 100).toFixed(1)}%`));
        console.log(chalk.magenta(`⭐ 平均分数: ${accuracy.avgScore.toFixed(3)}`));
      } else {
        console.log(chalk.red(`❌ 测试失败: ${result.error}`));
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 找出最佳权重组合
    if (optimizationResults.length > 0) {
      const bestAccuracy = optimizationResults.reduce((best, current) =>
        current.accuracy.avgScore > best.accuracy.avgScore ? current : best
      );

      const bestPerformance = optimizationResults.reduce((best, current) =>
        current.responseTime < best.responseTime ? current : best
      );

      console.log(chalk.bold.green('\n🏆 权重优化结果:'));
      console.log(chalk.green(`🥇 最佳准确性: ${bestAccuracy.weights.name} (向量${bestAccuracy.weights.vector}, 关键词${bestAccuracy.weights.keyword})`));
      console.log(chalk.blue(`⚡ 最佳性能: ${bestPerformance.weights.name} (${bestPerformance.responseTime.toFixed(0)}ms)`));
    }
  }

  printSummary () {
    console.log(chalk.bold.blue('\n📊 混合搜索测试总结'));
    console.log(chalk.gray('='.repeat(50)));

    const successful = this.results.filter(r => r.success);
    const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
    const avgAccuracy = successful.reduce((sum, r) => sum + (r.accuracy?.avgScore || 0), 0) / successful.length;

    console.log(chalk.green(`🎯 测试成功率: ${(successful.length / this.results.length * 100).toFixed(1)}%`));
    console.log(chalk.yellow(`⏱️  平均响应时间: ${avgResponseTime.toFixed(0)}ms`));
    console.log(chalk.cyan(`⭐ 平均搜索质量: ${avgAccuracy.toFixed(3)}`));

    console.log(chalk.bold.blue('\n💡 优化建议:'));
    if (avgResponseTime > 2000) {
      console.log(chalk.yellow('⚠️  响应时间较慢，建议优化向量计算或数据库查询'));
    }
    if (avgAccuracy < 0.5) {
      console.log(chalk.yellow('⚠️  搜索质量较低，建议调整权重或优化嵌入模型'));
    }
    if (successful.length / this.results.length < 0.95) {
      console.log(chalk.red('❌ 成功率较低，建议检查错误日志和系统稳定性'));
    }
  }

  async runAllTests () {
    console.log(chalk.bold.blue('🚀 开始混合搜索性能测试'));
    console.log(chalk.gray(`目标服务器: ${BASE_URL}`));
    console.log(chalk.gray(`测试时间: ${new Date().toLocaleString()}`));

    await this.runSearchAccuracyTest();
    await this.runPerformanceTest();
    await this.runWeightOptimizationTest();
    this.printSummary();
  }
}

// 运行测试
async function main () {
  const tester = new HybridSearchTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = HybridSearchTester;
