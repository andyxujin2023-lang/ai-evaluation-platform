#!/bin/bash
# 一键部署脚本
# 使用方法: sudo bash deploy.sh

set -e

echo "====================================="
echo "AI 运维评测平台 - 一键部署脚本"
echo "====================================="

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 配置变量
PROJECT_DIR="/var/www/ai-evaluation-platform"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DOMAIN=${1:-"_"}

echo "项目目录: $PROJECT_DIR"
echo "域名: $DOMAIN"

# 1. 安装系统依赖
echo ""
echo "[1/8] 安装系统依赖..."
apt update
apt install -y python3 python3-pip python3-venv nodejs nginx git

# 2. 设置项目目录权限
echo ""
echo "[2/8] 设置目录权限..."
mkdir -p $PROJECT_DIR
chown -R www-data:www-data $PROJECT_DIR

# 3. 设置后端 Python 环境
echo ""
echo "[3/8] 设置后端 Python 环境..."
cd $BACKEND_DIR
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 4. 初始化数据库
echo ""
echo "[4/8] 初始化数据库..."
python init_db.py
chown -R www-data:www-data $BACKEND_DIR/*.db 2>/dev/null || true

# 5. 构建前端
echo ""
echo "[5/8] 构建前端..."
cd $FRONTEND_DIR
npm install
npm run build

# 6. 配置 Nginx
echo ""
echo "[6/8] 配置 Nginx..."
cp $PROJECT_DIR/deploy/nginx.conf /etc/nginx/sites-available/ai-evaluation-platform
sed -i "s/server_name _;/server_name $DOMAIN;/" /etc/nginx/sites-available/ai-evaluation-platform

# 删除默认站点
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/ai-evaluation-platform /etc/nginx/sites-enabled/

# 测试 Nginx 配置
nginx -t

# 7. 配置 Systemd 服务
echo ""
echo "[7/8] 配置 Systemd 服务..."
cp $PROJECT_DIR/deploy/ai-evaluation-backend.service /etc/systemd/system/
sed -i "s|/var/www/ai-evaluation-platform|$PROJECT_DIR|g" /etc/systemd/system/ai-evaluation-backend.service

systemctl daemon-reload
systemctl enable ai-evaluation-backend
systemctl restart ai-evaluation-backend

# 8. 重启 Nginx
echo ""
echo "[8/8] 重启 Nginx..."
systemctl restart nginx

echo ""
echo "====================================="
echo "部署完成！"
echo "====================================="
echo ""
echo "访问地址: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "服务状态:"
echo "  后端: systemctl status ai-evaluation-backend"
echo "  前端: systemctl status nginx"
echo ""
echo "查看日志:"
echo "  后端: journalctl -u ai-evaluation-backend -f"
echo "  Nginx: tail -f /var/log/nginx/access.log"
echo ""
