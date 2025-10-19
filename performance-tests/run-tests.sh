#!/bin/bash

# OceanBase Search 性能测试执行脚本
# 使用方法: ./run-tests.sh [test-type]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 检查依赖
check_dependencies() {
    print_message "🔍 检查依赖..." $BLUE
    
    if ! command -v node &> /dev/null; then
        print_message "❌ Node.js 未安装" $RED
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_message "❌ npm 未安装" $RED
        exit 1
    fi
    
    print_message "✅ 依赖检查通过" $GREEN
}

# 安装依赖
install_dependencies() {
    print_message "📦 安装依赖..." $BLUE
    npm install
    print_message "✅ 依赖安装完成" $GREEN
}

# 检查环境配置
check_environment() {
    print_message "🔧 检查环境配置..." $BLUE
    
    if [ ! -f ".env" ]; then
        print_message "⚠️  未找到 .env 文件，创建示例配置..." $YELLOW
        cat > .env << EOF
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
EOF
        print_message "📝 请编辑 .env 文件配置正确的参数" $YELLOW
    fi
    
    print_message "✅ 环境配置检查完成" $GREEN
}

# 运行 API 性能测试
run_api_test() {
    print_message "🚀 运行 API 性能测试..." $BLUE
    npm run test:api
}

# 运行混合搜索测试
run_hybrid_search_test() {
    print_message "🔍 运行混合搜索测试..." $BLUE
    npm run test:hybrid-search
}

# 运行数据库性能测试
run_database_test() {
    print_message "🗄️  运行数据库性能测试..." $BLUE
    npm run test:database
}

# 运行前端性能测试
run_frontend_test() {
    print_message "🎨 运行前端性能测试..." $BLUE
    npm run test:frontend
}

# 运行负载测试
run_load_test() {
    print_message "⚡ 运行负载测试..." $BLUE
    npm run test:load
}

# 启动实时监控
start_monitor() {
    print_message "📊 启动实时性能监控..." $BLUE
    print_message "按 Ctrl+C 停止监控" $YELLOW
    npm run monitor:start
}

# 运行 Lighthouse 审计
run_lighthouse() {
    print_message "🔍 运行 Lighthouse 性能审计..." $BLUE
    npm run lighthouse
}

# 运行所有测试
run_all_tests() {
    print_message "🎯 运行完整性能测试套件..." $BLUE
    
    run_api_test
    echo ""
    run_hybrid_search_test
    echo ""
    run_database_test
    echo ""
    run_frontend_test
    echo ""
    run_load_test
    
    print_message "🎉 所有测试完成！" $GREEN
}

# 显示帮助信息
show_help() {
    echo "OceanBase Search 性能测试工具"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  api         运行 API 性能测试"
    echo "  hybrid      运行混合搜索测试"
    echo "  database    运行数据库性能测试"
    echo "  frontend    运行前端性能测试"
    echo "  load        运行负载测试"
    echo "  monitor     启动实时监控"
    echo "  lighthouse  运行 Lighthouse 审计"
    echo "  all         运行所有测试"
    echo "  help        显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 api       # 只运行 API 测试"
    echo "  $0 all       # 运行所有测试"
    echo "  $0 monitor   # 启动实时监控"
}

# 主函数
main() {
    print_message "🚀 OceanBase Search 性能测试工具" $BLUE
    print_message "=================================" $BLUE
    
    # 检查依赖
    check_dependencies
    
    # 检查环境配置
    check_environment
    
    # 安装依赖（如果需要）
    if [ ! -d "node_modules" ]; then
        install_dependencies
    fi
    
    # 根据参数执行相应测试
    case "${1:-all}" in
        "api")
            run_api_test
            ;;
        "hybrid")
            run_hybrid_search_test
            ;;
        "database")
            run_database_test
            ;;
        "frontend")
            run_frontend_test
            ;;
        "load")
            run_load_test
            ;;
        "monitor")
            start_monitor
            ;;
        "lighthouse")
            run_lighthouse
            ;;
        "all")
            run_all_tests
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_message "❌ 未知选项: $1" $RED
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
