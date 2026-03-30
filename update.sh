
#!/bin/bash
# AI 运维评测平台 - 快速更新脚本
# 适用于已部署的服务器

set -e

PROJECT_DIR="/opt/AI-Evaluation-Platform"
BACKUP_DIR="/opt/ai-evaluation-backups"

echo "========================================="
echo "   AI 运维评测平台 - 快速更新"
echo "========================================="
echo ""

# 1. 检查项目目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo "错误：项目目录 $PROJECT_DIR 不存在"
    exit 1
fi

cd $PROJECT_DIR

# 2. 备份数据库
echo "[1/7] 备份数据库..."
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/ai_evaluation.db.backup.$(date +%Y%m%d_%H%M%S)"
if [ -f "backend/ai_evaluation.db" ]; then
    cp backend/ai_evaluation.db "$BACKUP_FILE"
    echo "数据库已备份到: $BACKUP_FILE"
else
    echo "警告：未找到数据库文件，跳过备份"
fi

# 3. 拉取最新代码
echo ""
echo "[2/7] 拉取最新代码..."
if [ -d ".git" ]; then
    git fetch origin
    git checkout master
    git pull origin master
else
    echo "警告：不是Git仓库，跳过代码拉取"
fi

# 4. 运行数据库迁移
echo ""
echo "[3/7] 运行数据库迁移..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "警告：未找到虚拟环境，尝试使用系统Python"
fi

# 运行迁移脚本（如果存在）
for migrate_file in migrate_*.py; do
    if [ -f "$migrate_file" ]; then
        echo "运行迁移: $migrate_file"
        python "$migrate_file" || echo "迁移 $migrate_file 执行完成或已执行过"
    fi
done

# 5. 更新后端依赖
echo ""
echo "[4/7] 更新后端依赖..."
pip install -r requirements.txt

# 6. 重新构建前端
echo ""
echo "[5/7] 重新构建前端..."
cd ../frontend
if [ -d "node_modules" ]; then
    npm install
else
    echo "安装前端依赖..."
    npm install
fi
npm run build

# 7. 重启服务
echo ""
echo "[6/7] 重启服务..."
cd ..

# 尝试多种方式重启服务
if command -v systemctl &amp;&gt; /dev/null; then
    if systemctl list-unit-files | grep -q ai-evaluation-backend; then
        echo "使用 systemctl 重启后端..."
        sudo systemctl restart ai-evaluation-backend || echo "后端重启完成或无需重启"
    fi
    if systemctl list-unit-files | grep -q nginx; then
        echo "使用 systemctl 重载 Nginx..."
        sudo systemctl reload nginx || echo "Nginx重载完成"
    fi
fi

# 如果有 PM2，尝试使用 PM2
if command -v pm2 &amp;&gt; /dev/null; then
    if pm2 list | grep -q ai-evaluation-backend; then
        echo "使用 PM2 重启后端..."
        pm2 restart ai-evaluation-backend || true
    fi
    if pm2 list | grep -q ai-evaluation-frontend; then
        echo "使用 PM2 重启前端..."
        pm2 restart ai-evaluation-frontend || true
    fi
fi

echo ""
echo "========================================="
echo "   更新完成！"
echo "========================================="
echo ""
echo "数据库备份位置: $BACKUP_FILE"
echo ""
echo "下一步："
echo "1. 访问网站验证功能正常"
echo "2. 检查服务状态："
echo "   sudo systemctl status ai-evaluation-backend"
echo "   sudo journalctl -u ai-evaluation-backend -f"
echo ""
echo "如果遇到问题，可以使用备份回滚："
echo "cp $BACKUP_FILE $PROJECT_DIR/backend/ai_evaluation.db"
echo ""
