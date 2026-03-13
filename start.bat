@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
:: 收支管理系统 - 一键快速启动脚本
:: ============================================================

set "SETUP_DIR=.setup"
set "BACKEND_DIR=backend"
set "FRONT_DIR=front"

:: Encoding sanity check
set "CHECK_STR=OK"
if not "%CHECK_STR%"=="OK" (
    echo [Error] 脚本编码异常，请使用 UTF-8 with BOM。
    pause
    exit /b 1
)

echo ============================================================
echo   收支管理系统 - 一键启动
echo ============================================================
echo [步骤 1/5] 正在检查运行环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装后再运行。
    pause
    exit /b 1
)
echo [成功] Node.js 环境就绪。

echo [步骤 2/5] 正在准备依赖组件...
set "INSTALL_CMD=npm install --no-audit --no-fund"
if not exist "%SETUP_DIR%\node_modules\" (
    echo 正在安装核心组件，请稍候...
    pushd "%SETUP_DIR%"
    call %INSTALL_CMD%
    if !errorlevel! neq 0 (
        echo [错误] 核心组件安装失败，请检查网络。
        popd
        pause
        exit /b 1
    )
    popd
)
if not exist "%SETUP_DIR%\node_modules\.bin\concurrently.cmd" (
    echo 正在补齐 concurrently 组件...
    pushd "%SETUP_DIR%"
    call %INSTALL_CMD% concurrently
    if !errorlevel! neq 0 (
        echo [错误] 无法安装 concurrently，请稍后重试。
        popd
        pause
        exit /b 1
    )
    popd
)
echo [成功] 核心组件已准备好。

echo [步骤 3/5] 正在检查项目依赖...
if not exist "%BACKEND_DIR%\node_modules\" (
    echo 正在安装后端依赖...
    pushd "%BACKEND_DIR%"
    call %INSTALL_CMD%
    if !errorlevel! neq 0 (
        echo [错误] 后端依赖安装失败。
        popd
        pause
        exit /b 1
    )
    popd
)
if not exist "%FRONT_DIR%\node_modules\" (
    echo 正在安装前端依赖...
    pushd "%FRONT_DIR%"
    call %INSTALL_CMD%
    if !errorlevel! neq 0 (
        echo [错误] 前端依赖安装失败。
        popd
        pause
        exit /b 1
    )
    popd
)
echo [成功] 项目依赖已校验。

echo [步骤 4/5] 正在检查 Python 环境及 AI 大模型依赖...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [警告] 未检测到 Python，AI智能分类功能将无法启动。但基础服务不受影响。
) else (
    if not exist "llm_service\venv\" (
        echo 正在创建 Python 虚拟环境...
        python -m venv llm_service\venv
    )
    echo 正在安装/更新 AI 服务依赖...
    pushd llm_service
    call venv\Scripts\activate.bat
    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
    popd
)
echo [成功] AI 依赖检查完毕。

echo [步骤 5/5] 正在启动系统服务...
set "CONC=%SETUP_DIR%\node_modules\.bin\concurrently"
if exist "%CONC%.cmd" (
    :: 根据是否有 venv 判断是否启动 AI 分类引擎
    if exist "llm_service\venv\" (
        call "%CONC%.cmd" -n "后端服务,前端界面,AI分类服务" -c "blue,green,magenta" "cd backend && npm run dev" "cd front && npm run dev" "cd llm_service && venv\Scripts\python -m uvicorn main:app --reload --port 8000"
    ) else (
        call "%CONC%.cmd" -n "后端服务,前端界面" -c "blue,green" "cd backend && npm run dev" "cd front && npm run dev"
    )
) else (
    echo [错误] 未找到 concurrently，可尝试重新运行本脚本。
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo [提示] 系统已停止运行。
    pause
)
