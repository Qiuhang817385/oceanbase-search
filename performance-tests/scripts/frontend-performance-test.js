const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');
const cliProgress = require('cli-progress');
const chalk = require('chalk');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PAGES = [
  {
    name: '电影搜索页面',
    url: '/prisma-search',
    waitForSelector: '[data-testid="movie-search-page"]'
  },
  {
    name: '混合搜索演示',
    url: '/hybrid-search-demo',
    waitForSelector: '[data-testid="hybrid-search-demo"]'
  }
];

class FrontendPerformanceTester {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async init () {
    console.log(chalk.blue('🚀 启动浏览器...'));
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async close () {
    if (this.browser) {
      await this.browser.close();
      console.log(chalk.blue('🔌 浏览器已关闭'));
    }
  }

  async measurePageLoad (page, url) {
    const startTime = performance.now();

    try {
      // 开始性能测量
      await page.evaluateOnNewDocument(() => {
        window.performanceMetrics = {
          navigationStart: performance.timing.navigationStart,
          loadEventEnd: 0,
          domContentLoaded: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          firstInputDelay: 0,
          cumulativeLayoutShift: 0
        };
      });

      // 导航到页面
      const response = await page.goto(`${BASE_URL}${url}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // 获取性能指标
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');

        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          largestContentfulPaint: lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0,
          responseTime: navigation.responseEnd - navigation.requestStart,
          transferSize: navigation.transferSize,
          status: response.status()
        };
      });

      return {
        success: true,
        loadTime: Math.round(loadTime),
        metrics: {
          ...metrics,
          status: response.status()
        }
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        loadTime: Math.round(endTime - startTime),
        error: error.message
      };
    }
  }

  async measureInteractionPerformance (page, testName) {
    const interactions = [
      {
        name: '搜索输入',
        action: async () => {
          await page.type('[data-testid="search-input"]', '复仇者');
          await page.waitForTimeout(500);
        }
      },
      {
        name: '年份选择',
        action: async () => {
          await page.click('[data-testid="year-select"]');
          await page.waitForTimeout(200);
          await page.click('[data-testid="year-option-2023"]');
          await page.waitForTimeout(500);
        }
      },
      {
        name: '类型选择',
        action: async () => {
          await page.click('[data-testid="genre-select"]');
          await page.waitForTimeout(200);
          await page.click('[data-testid="genre-option-动作"]');
          await page.waitForTimeout(500);
        }
      },
      {
        name: '分页导航',
        action: async () => {
          await page.click('[data-testid="next-page"]');
          await page.waitForTimeout(1000);
        }
      }
    ];

    const results = [];

    for (const interaction of interactions) {
      const startTime = performance.now();

      try {
        await interaction.action();
        const endTime = performance.now();

        results.push({
          name: interaction.name,
          success: true,
          responseTime: Math.round(endTime - startTime)
        });
      } catch (error) {
        const endTime = performance.now();
        results.push({
          name: interaction.name,
          success: false,
          responseTime: Math.round(endTime - startTime),
          error: error.message
        });
      }
    }

    return results;
  }

  async measureMemoryUsage (page) {
    try {
      const metrics = await page.metrics();
      return {
        jsHeapUsedSize: metrics.JSHeapUsedSize,
        jsHeapTotalSize: metrics.JSHeapTotalSize,
        timestamp: metrics.Timestamp
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  async testPage (pageConfig) {
    console.log(chalk.blue(`\n📄 测试页面: ${pageConfig.name}`));
    console.log(chalk.gray(`URL: ${BASE_URL}${pageConfig.url}`));

    const page = await this.browser.newPage();

    try {
      // 设置视口
      await page.setViewport({ width: 1920, height: 1080 });

      // 启用性能监控
      await page.setCacheEnabled(false);

      // 测量页面加载性能
      const loadResult = await this.measurePageLoad(page, pageConfig.url);

      if (!loadResult.success) {
        console.log(chalk.red(`❌ 页面加载失败: ${loadResult.error}`));
        return {
          page: pageConfig.name,
          success: false,
          error: loadResult.error
        };
      }

      console.log(chalk.green(`✅ 页面加载成功 (${loadResult.loadTime}ms)`));
      console.log(chalk.yellow(`⏱️  DOM 加载: ${Math.round(loadResult.metrics.domContentLoaded)}ms`));
      console.log(chalk.cyan(`🎨 首次绘制: ${Math.round(loadResult.metrics.firstPaint)}ms`));
      console.log(chalk.magenta(`📝 首次内容绘制: ${Math.round(loadResult.metrics.firstContentfulPaint)}ms`));
      console.log(chalk.blue(`🖼️  最大内容绘制: ${Math.round(loadResult.metrics.largestContentfulPaint)}ms`));

      // 等待页面完全加载
      await page.waitForTimeout(2000);

      // 测量交互性能
      const interactionResults = await this.measureInteractionPerformance(page, pageConfig.name);

      // 测量内存使用
      const memoryUsage = await this.measureMemoryUsage(page);

      // 获取网络请求统计
      const networkStats = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return {
          totalRequests: resources.length,
          totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
          avgResponseTime: resources.reduce((sum, r) => sum + (r.responseEnd - r.requestStart), 0) / resources.length
        };
      });

      const result = {
        page: pageConfig.name,
        success: true,
        loadTime: loadResult.loadTime,
        metrics: loadResult.metrics,
        interactions: interactionResults,
        memoryUsage,
        networkStats
      };

      this.results.push(result);
      this.printPageResult(result);

      return result;
    } finally {
      await page.close();
    }
  }

  printPageResult (result) {
    console.log(chalk.bold.blue('\n📊 页面性能详情:'));

    // 交互性能
    if (result.interactions) {
      console.log(chalk.yellow('\n🖱️  交互性能:'));
      result.interactions.forEach(interaction => {
        const status = interaction.success ? '✅' : '❌';
        console.log(chalk.white(`   ${status} ${interaction.name}: ${interaction.responseTime}ms`));
        if (!interaction.success) {
          console.log(chalk.red(`      ${interaction.error}`));
        }
      });
    }

    // 内存使用
    if (result.memoryUsage && !result.memoryUsage.error) {
      console.log(chalk.cyan('\n💾 内存使用:'));
      console.log(chalk.white(`   JS 堆使用: ${(result.memoryUsage.jsHeapUsedSize / 1024 / 1024).toFixed(2)} MB`));
      console.log(chalk.white(`   JS 堆总计: ${(result.memoryUsage.jsHeapTotalSize / 1024 / 1024).toFixed(2)} MB`));
    }

    // 网络统计
    if (result.networkStats) {
      console.log(chalk.magenta('\n🌐 网络统计:'));
      console.log(chalk.white(`   总请求数: ${result.networkStats.totalRequests}`));
      console.log(chalk.white(`   总传输大小: ${(result.networkStats.totalSize / 1024).toFixed(2)} KB`));
      console.log(chalk.white(`   平均响应时间: ${Math.round(result.networkStats.avgResponseTime)}ms`));
    }
  }

  async runLighthouseAudit () {
    console.log(chalk.bold.blue('\n🔍 Lighthouse 性能审计'));
    console.log(chalk.gray('='.repeat(50)));

    const lighthouse = require('lighthouse');
    const chrome = await puppeteer.launch({ headless: true });

    try {
      for (const pageConfig of TEST_PAGES) {
        console.log(chalk.blue(`\n🔍 审计页面: ${pageConfig.name}`));

        const options = {
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance'],
          port: new URL(chrome.wsEndpoint()).port
        };

        const runnerResult = await lighthouse(`${BASE_URL}${pageConfig.url}`, options);
        const report = runnerResult.lhr;

        const performanceScore = report.categories.performance.score * 100;
        const metrics = report.audits;

        console.log(chalk.green(`🎯 性能分数: ${Math.round(performanceScore)}`));
        console.log(chalk.yellow(`⏱️  FCP: ${Math.round(metrics['first-contentful-paint'].numericValue)}ms`));
        console.log(chalk.cyan(`🖼️  LCP: ${Math.round(metrics['largest-contentful-paint'].numericValue)}ms`));
        console.log(chalk.magenta(`⚡ FID: ${Math.round(metrics['max-potential-fid'].numericValue)}ms`));
        console.log(chalk.blue(`📐 CLS: ${metrics['cumulative-layout-shift'].numericValue.toFixed(3)}`));

        // 性能建议
        const opportunities = Object.values(metrics)
          .filter(audit => audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0)
          .sort((a, b) => b.numericValue - a.numericValue)
          .slice(0, 3);

        if (opportunities.length > 0) {
          console.log(chalk.yellow('\n💡 优化建议:'));
          opportunities.forEach(opportunity => {
            console.log(chalk.gray(`   - ${opportunity.title}: 可节省 ${Math.round(opportunity.numericValue)}ms`));
          });
        }
      }
    } finally {
      await chrome.close();
    }
  }

  printSummary () {
    console.log(chalk.bold.blue('\n📊 前端性能测试总结'));
    console.log(chalk.gray('='.repeat(50)));

    if (this.results.length === 0) {
      console.log(chalk.yellow('⚠️  没有可用的测试结果'));
      return;
    }

    const successful = this.results.filter(r => r.success);
    const avgLoadTime = successful.reduce((sum, r) => sum + r.loadTime, 0) / successful.length;
    const avgFCP = successful.reduce((sum, r) => sum + (r.metrics?.firstContentfulPaint || 0), 0) / successful.length;
    const avgLCP = successful.reduce((sum, r) => sum + (r.metrics?.largestContentfulPaint || 0), 0) / successful.length;

    console.log(chalk.green(`🎯 测试成功率: ${(successful.length / this.results.length * 100).toFixed(1)}%`));
    console.log(chalk.yellow(`⏱️  平均加载时间: ${Math.round(avgLoadTime)}ms`));
    console.log(chalk.cyan(`🎨 平均 FCP: ${Math.round(avgFCP)}ms`));
    console.log(chalk.magenta(`🖼️  平均 LCP: ${Math.round(avgLCP)}ms`));

    console.log(chalk.bold.blue('\n📋 详细结果:'));
    this.results.forEach((result, index) => {
      console.log(chalk.white(`${index + 1}. ${result.page}`));
      console.log(chalk.gray(`   加载时间: ${result.loadTime}ms | FCP: ${Math.round(result.metrics?.firstContentfulPaint || 0)}ms | LCP: ${Math.round(result.metrics?.largestContentfulPaint || 0)}ms`));
    });

    // 性能建议
    this.printPerformanceRecommendations();
  }

  printPerformanceRecommendations () {
    console.log(chalk.bold.blue('\n💡 前端性能优化建议:'));

    const slowPages = this.results.filter(r => r.success && r.loadTime > 3000);
    const highMemoryPages = this.results.filter(r => r.success && r.memoryUsage?.jsHeapUsedSize > 50 * 1024 * 1024);

    if (slowPages.length > 0) {
      console.log(chalk.yellow('⚠️  加载时间较慢的页面:'));
      slowPages.forEach(page => {
        console.log(chalk.yellow(`   - ${page.page}: ${page.loadTime}ms`));
      });
      console.log(chalk.gray('   建议: 优化资源加载、使用代码分割、启用压缩'));
    }

    if (highMemoryPages.length > 0) {
      console.log(chalk.red('⚠️  内存使用较高的页面:'));
      highMemoryPages.forEach(page => {
        const memoryMB = (page.memoryUsage.jsHeapUsedSize / 1024 / 1024).toFixed(2);
        console.log(chalk.red(`   - ${page.page}: ${memoryMB} MB`));
      });
      console.log(chalk.gray('   建议: 检查内存泄漏、优化组件渲染、减少不必要的状态'));
    }

    // 通用建议
    console.log(chalk.blue('\n🔧 通用优化建议:'));
    console.log(chalk.gray('1. 使用 Next.js 的图片优化和懒加载'));
    console.log(chalk.gray('2. 启用 SWR 缓存减少重复请求'));
    console.log(chalk.gray('3. 使用 React.memo 和 useMemo 优化渲染'));
    console.log(chalk.gray('4. 实施代码分割和动态导入'));
    console.log(chalk.gray('5. 优化字体和 CSS 加载'));

    if (slowPages.length === 0 && highMemoryPages.length === 0) {
      console.log(chalk.green('🎉 前端性能表现良好！'));
    }
  }

  async runAllTests () {
    console.log(chalk.bold.blue('🚀 开始前端性能测试'));
    console.log(chalk.gray(`目标网站: ${BASE_URL}`));
    console.log(chalk.gray(`测试时间: ${new Date().toLocaleString()}`));

    await this.init();

    try {
      // 测试各个页面
      for (const pageConfig of TEST_PAGES) {
        await this.testPage(pageConfig);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 运行 Lighthouse 审计
      await this.runLighthouseAudit();

      this.printSummary();
    } finally {
      await this.close();
    }
  }
}

// 运行测试
async function main () {
  const tester = new FrontendPerformanceTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FrontendPerformanceTester;
