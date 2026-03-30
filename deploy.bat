
@echo off
REM AI 运维评测平台 - Windows 部署脚本
REM 请以管理员身份运行此脚本

echo =========================================
echo    AI 运维评测平台 - Windows 部署
echo =========================================
echo.

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo [1/5] 检查 Python...
python --version &gt;nul 2&gt;&amp;1
if %errorlevel% neq 0 (
    echo 错误：未找到 Python，请先安装 Python 3.8+
    pause
    exit /b 1
)
echo Python 检查通过
echo.

echo [2/5] 检查 Node.js...
node --version &gt;nul 2&gt;&amp;1
if %errorlevel% neq 0 (
    echo 错误：未找到 Node.js，请先安装 Node.js 16+
    pause
    exit /b 1
)
echo Node.js 检查通过
echo.

echo [3/5] 安装后端依赖...
cd backend
if not exist "venv" (
    echo 创建虚拟环境...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt
pip install gunicorn
cd ..
echo 后端依赖安装完成
echo.

echo [4/5] 构建前端...
cd frontend
call npm install
call npm run build
cd ..
echo 前端构建完成
echo.

echo [5/5] 创建启动脚本...

echo @echo off &gt; start_backend.bat
echo cd /d "%PROJECT_DIR%backend" &gt;&gt; start_backend.bat
echo call venv\Scripts\activate &gt;&gt; start_backend.bat
echo python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &gt;&gt; start_backend.bat

echo @echo off &gt; start_frontend.bat
echo cd /d "%PROJECT_DIR%frontend" &gt;&gt; start_frontend.bat
echo npx serve dist -l 3000 &gt;&gt; start_frontend.bat

echo =========================================
echo    部署完成！
echo =========================================
echo.
echo 启动方式：
echo 1. 运行 start_backend.bat 启动后端
echo 2. 运行 start_frontend.bat 启动前端
echo.
echo 访问地址：http://localhost:3000
echo.
echo 注意：生产环境建议使用 Nginx 或 IIS 部署
echo.
pause
