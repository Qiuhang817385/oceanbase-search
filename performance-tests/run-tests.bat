@echo off
setlocal enabledelayedexpansion

REM OceanBase Search 性能测试执行脚本 (Windows)
REM 使用方法: run-tests.bat [test-type]

title OceanBase Search 性能测试工具

echo.
echo 🚀 OceanBase Search 性能测试工具
echo =================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm 未安装，请先安装 npm
    pause
    exit /b 1
)

echo ✅ 依赖检查通过
echo.

REM 检查 .env 文件
if not exist ".env" (
    echo ⚠️  未找到 .env 文件，创建示例配置...
    (
        echo # 服务器配置
        echo BASE_URL=http://localhost:3000
        echo.
        echo # 数据库配置
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USER=root
        echo DB_PASSWORD=your_password
        echo DB_NAME=oceanbase_search
        echo.
        echo # OpenAI API 配置（用于混合搜索测试）
        echo OPENAI_API_KEY=your_openai_api_key
        echo EMBEDDING_MODEL=text-embedding-v4
        echo DIMENSIONS=1536
    ) > .env
    echo 📝 请编辑 .env 文件配置正确的参数
    echo.
)

REM 安装依赖（如果需要）
if not exist "node_modules" (
    echo 📦 安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

REM 根据参数执行相应测试
set "test_type=%1"
if "%test_type%"=="" set "test_type=all"

if "%test_type%"=="api" (
    echo 🚀 运行 API 性能测试...
    npm run test:api
) else if "%test_type%"=="hybrid" (
    echo 🔍 运行混合搜索测试...
    npm run test:hybrid-search
) else if "%test_type%"=="database" (
    echo 🗄️  运行数据库性能测试...
    npm run test:database
) else if "%test_type%"=="frontend" (
    echo 🎨 运行前端性能测试...
    npm run test:frontend
) else if "%test_type%"=="load" (
    echo ⚡ 运行负载测试...
    npm run test:load
) else if "%test_type%"=="monitor" (
    echo 📊 启动实时性能监控...
    echo 按 Ctrl+C 停止监控
    npm run monitor:start
) else if "%test_type%"=="lighthouse" (
    echo 🔍 运行 Lighthouse 性能审计...
    npm run lighthouse
) else if "%test_type%"=="all" (
    echo 🎯 运行完整性能测试套件...
    echo.
    echo 🚀 运行 API 性能测试...
    npm run test:api
    echo.
    echo 🔍 运行混合搜索测试...
    npm run test:hybrid-search
    echo.
    echo 🗄️  运行数据库性能测试...
    npm run test:database
    echo.
    echo 🎨 运行前端性能测试...
    npm run test:frontend
    echo.
    echo ⚡ 运行负载测试...
    npm run test:load
    echo.
    echo 🎉 所有测试完成！
) else if "%test_type%"=="help" (
    echo OceanBase Search 性能测试工具
    echo.
    echo 使用方法:
    echo   run-tests.bat [选项]
    echo.
    echo 选项:
    echo   api         运行 API 性能测试
    echo   hybrid      运行混合搜索测试
    echo   database    运行数据库性能测试
    echo   frontend    运行前端性能测试
    echo   load        运行负载测试
    echo   monitor     启动实时监控
    echo   lighthouse  运行 Lighthouse 审计
    echo   all         运行所有测试
    echo   help        显示帮助信息
    echo.
    echo 示例:
    echo   run-tests.bat api       # 只运行 API 测试
    echo   run-tests.bat all       # 运行所有测试
    echo   run-tests.bat monitor   # 启动实时监控
) else (
    echo ❌ 未知选项: %test_type%
    echo 使用 run-tests.bat help 查看帮助信息
    pause
    exit /b 1
)

echo.
echo 测试完成！
pause
