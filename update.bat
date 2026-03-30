
@echo off
REM AI 运维评测平台 - Windows 更新脚本

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo =========================================
echo    AI 运维评测平台 - Windows 更新
echo =========================================
echo.

echo [1/6] 备份数据库...
set BACKUP_FILE=backend\ai_evaluation.db.backup.%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_FILE=%BACKUP_FILE: =0%
if exist "backend\ai_evaluation.db" (
    copy "backend\ai_evaluation.db" "%BACKUP_FILE%"
    echo 数据库已备份到: %BACKUP_FILE%
) else (
    echo 警告：未找到数据库文件
)

echo.
echo [2/6] 拉取最新代码...
if exist ".git" (
    git fetch origin
    git checkout master
    git pull origin master
) else (
    echo 警告：不是Git仓库，跳过代码拉取
)

echo.
echo [3/6] 运行数据库迁移...
cd backend
if exist "venv" (
    call venv\Scripts\activate
)

for %%f in (migrate_*.py) do (
    if exist "%%f" (
        echo 运行迁移: %%f
        python "%%f"
    )
)

echo.
echo [4/6] 更新后端依赖...
pip install -r requirements.txt

echo.
echo [5/6] 重新构建前端...
cd ..\frontend
if exist "node_modules" (
    npm install
) else (
    echo 安装前端依赖...
    npm install
)
npm run build

echo.
echo [6/6] 更新完成！
echo.
echo 请手动重启服务
echo.
echo 数据库备份位置: %BACKUP_FILE%
echo.
pause
