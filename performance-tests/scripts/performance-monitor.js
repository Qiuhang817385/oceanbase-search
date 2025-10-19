const axios = require('axios');
const { performance } = require('perf_hooks');
const cliProgress = require('cli-progress');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MONITOR_INTERVAL = 5000; // 5秒
const MONITOR_DURATION = 300000; // 5分钟
const LOG_FILE = path.join(__dirname, '../logs/performance-monitor.log');

// 监控指标
const metrics = {
  api: {
    movies: { requests: 0, totalTime: 0, errors: 0, avgTime: 0 },
    hybridSearch: { requests: 0, totalTime: 0, errors: 0, avgTime: 0 }
  },
  system: {
    startTime: Date.now(),
    totalRequests: 0,
    totalErrors: 0,
    peakResponseTime: 0,
    minResponseTime: Infinity
  }
};

class PerformanceMonitor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.logStream = null;
    this.ensureLogDirectory();
  }

  ensureLogDirectory () {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  startLogging () {
    this.logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    this.logStream.write(`\n=== 性能监控开始: ${new Date().toISOString()} ===\n`);
  }

  stopLogging () {
    if (this.logStream) {
      this.logStream.write(`=== 性能监控结束: ${new Date().toISOString()} ===\n\n`);
      this.logStream.end();
    }
  }

  log (level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    if (this.logStream) {
      this.logStream.write(logMessage + '\n');
      if (data) {
        this.logStream.write(JSON.stringify(data, null, 2) + '\n');
      }
    }
  }

  async testEndpoint (endpoint, method = 'GET', data = null) {
    const startTime = performance.now();

    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        timeout: 10000
      };

      if (method === 'POST' && data) {
        config.data = data;
        config.headers = { 'Content-Type': 'application/json' };
      }

      const response = await axios(config);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        success: true,
        responseTime,
        statusCode: response.status,
        dataSize: JSON.stringify(response.data).length
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error.message,
        statusCode: error.response?.status
      };
    }
  }

  updateMetrics (endpoint, result) {
    const endpointKey = endpoint.includes('hybrid-search') ? 'hybridSearch' : 'movies';
    const metric = metrics.api[endpointKey];

    metric.requests++;
    metric.totalTime += result.responseTime;
    metric.avgTime = metric.totalTime / metric.requests;

    if (!result.success) {
      metric.errors++;
    }

    // 更新系统指标
    metrics.system.totalRequests++;
    if (!result.success) {
      metrics.system.totalErrors++;
    }

    metrics.system.peakResponseTime = Math.max(metrics.system.peakResponseTime, result.responseTime);
    metrics.system.minResponseTime = Math.min(metrics.system.minResponseTime, result.responseTime);
  }

  async runHealthCheck () {
    const endpoints = [
      { path: '/api/movies', method: 'GET' },
      { path: '/api/movies', method: 'GET', params: { page: 1, limit: 5 } },
      { path: '/api/hybrid-search', method: 'POST', data: { query: 'test', limit: 5 } }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint.path, endpoint.method, endpoint.data);
      this.updateMetrics(endpoint.path, result);
      results.push({ endpoint: endpoint.path, ...result });
    }

    return results;
  }

  printCurrentStatus () {
    console.clear();
    console.log(chalk.bold.blue('📊 实时性能监控'));
    console.log(chalk.gray('='.repeat(60)));
    console.log(chalk.white(`⏰ 监控时间: ${new Date().toLocaleString()}`));
    console.log(chalk.white(`🌐 目标服务器: ${BASE_URL}`));
    console.log(chalk.white(`⏱️  运行时长: ${Math.round((Date.now() - metrics.system.startTime) / 1000)}s`));

    console.log(chalk.bold.yellow('\n📈 API 性能指标:'));

    // 电影 API 指标
    const moviesMetric = metrics.api.movies;
    console.log(chalk.cyan('\n🎬 电影 API:'));
    console.log(chalk.white(`   请求数: ${moviesMetric.requests}`));
    console.log(chalk.white(`   平均响应时间: ${Math.round(moviesMetric.avgTime)}ms`));
    console.log(chalk.white(`   错误数: ${moviesMetric.errors}`));
    console.log(chalk.white(`   成功率: ${((moviesMetric.requests - moviesMetric.errors) / moviesMetric.requests * 100).toFixed(1)}%`));

    // 混合搜索 API 指标
    const hybridMetric = metrics.api.hybridSearch;
    console.log(chalk.magenta('\n🔍 混合搜索 API:'));
    console.log(chalk.white(`   请求数: ${hybridMetric.requests}`));
    console.log(chalk.white(`   平均响应时间: ${Math.round(hybridMetric.avgTime)}ms`));
    console.log(chalk.white(`   错误数: ${hybridMetric.errors}`));
    console.log(chalk.white(`   成功率: ${((hybridMetric.requests - hybridMetric.errors) / hybridMetric.requests * 100).toFixed(1)}%`));

    // 系统指标
    console.log(chalk.bold.green('\n🖥️  系统指标:'));
    console.log(chalk.white(`   总请求数: ${metrics.system.totalRequests}`));
    console.log(chalk.white(`   总错误数: ${metrics.system.totalErrors}`));
    console.log(chalk.white(`   系统成功率: ${((metrics.system.totalRequests - metrics.system.totalErrors) / metrics.system.totalRequests * 100).toFixed(1)}%`));
    console.log(chalk.white(`   最快响应: ${metrics.system.minResponseTime === Infinity ? 'N/A' : Math.round(metrics.system.minResponseTime) + 'ms'}`));
    console.log(chalk.white(`   最慢响应: ${Math.round(metrics.system.peakResponseTime)}ms`));

    // 性能状态
    const overallAvgTime = (moviesMetric.avgTime + hybridMetric.avgTime) / 2;
    const overallSuccessRate = (metrics.system.totalRequests - metrics.system.totalErrors) / metrics.system.totalRequests * 100;

    console.log(chalk.bold.blue('\n🎯 性能状态:'));
    if (overallAvgTime < 500 && overallSuccessRate > 95) {
      console.log(chalk.green('✅ 系统性能良好'));
    } else if (overallAvgTime < 1000 && overallSuccessRate > 90) {
      console.log(chalk.yellow('⚠️  系统性能一般'));
    } else {
      console.log(chalk.red('❌ 系统性能需要优化'));
    }

    console.log(chalk.gray('\n按 Ctrl+C 停止监控...'));
  }

  async monitor () {
    try {
      const results = await this.runHealthCheck();

      // 记录详细日志
      results.forEach(result => {
        if (!result.success) {
          this.log('error', `API 请求失败: ${result.endpoint}`, {
            error: result.error,
            responseTime: result.responseTime,
            statusCode: result.statusCode
          });
        } else if (result.responseTime > 2000) {
          this.log('warn', `API 响应较慢: ${result.endpoint}`, {
            responseTime: result.responseTime,
            statusCode: result.statusCode
          });
        }
      });

      this.printCurrentStatus();
    } catch (error) {
      this.log('error', '监控过程中发生错误', { error: error.message });
    }
  }

  start () {
    if (this.isRunning) {
      console.log(chalk.yellow('⚠️  监控已在运行中'));
      return;
    }

    this.isRunning = true;
    this.startLogging();

    console.log(chalk.bold.blue('🚀 启动性能监控'));
    console.log(chalk.gray(`监控间隔: ${MONITOR_INTERVAL}ms`));
    console.log(chalk.gray(`监控时长: ${MONITOR_DURATION / 1000}s`));
    console.log(chalk.gray(`日志文件: ${LOG_FILE}`));

    this.intervalId = setInterval(() => {
      this.monitor();
    }, MONITOR_INTERVAL);

    // 设置自动停止
    setTimeout(() => {
      this.stop();
    }, MONITOR_DURATION);
  }

  stop () {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.stopLogging();

    console.log(chalk.bold.blue('\n📊 监控总结'));
    console.log(chalk.gray('='.repeat(50)));

    const totalTime = Date.now() - metrics.system.startTime;
    const overallSuccessRate = (metrics.system.totalRequests - metrics.system.totalErrors) / metrics.system.totalRequests * 100;
    const avgRequestsPerSecond = metrics.system.totalRequests / (totalTime / 1000);

    console.log(chalk.green(`🎯 总体成功率: ${overallSuccessRate.toFixed(1)}%`));
    console.log(chalk.yellow(`📊 平均请求速率: ${avgRequestsPerSecond.toFixed(2)} 请求/秒`));
    console.log(chalk.cyan(`⏱️  监控时长: ${Math.round(totalTime / 1000)}s`));
    console.log(chalk.magenta(`📝 日志文件: ${LOG_FILE}`));

    console.log(chalk.blue('\n🔌 监控已停止'));
  }

  // 生成性能报告
  generateReport () {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - metrics.system.startTime,
      metrics: {
        ...metrics,
        system: {
          ...metrics.system,
          avgRequestsPerSecond: metrics.system.totalRequests / ((Date.now() - metrics.system.startTime) / 1000),
          overallSuccessRate: (metrics.system.totalRequests - metrics.system.totalErrors) / metrics.system.totalRequests * 100
        }
      }
    };

    const reportFile = path.join(__dirname, '../reports/performance-report.json');
    const reportDir = path.dirname(reportFile);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(chalk.green(`📄 性能报告已生成: ${reportFile}`));

    return report;
  }
}

// 处理退出信号
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 收到停止信号，正在关闭监控...'));
  if (global.monitor) {
    global.monitor.stop();
    global.monitor.generateReport();
  }
  process.exit(0);
});

// 运行监控
async function main () {
  const monitor = new PerformanceMonitor();
  global.monitor = monitor;

  monitor.start();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceMonitor;
