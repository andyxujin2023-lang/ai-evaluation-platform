
#!/bin/bash
# AI 运维评测平台 - 快速部署脚本
# 适用于 Ubuntu 20.04+ / Debian 11+

set -e

echo "========================================="
echo "   AI 运维评测平台 - 快速部署"
echo "========================================="

# 配置变量
PROJECT_DIR="/opt/AI-Evaluation-Platform"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 或 root 用户运行此脚本"
    exit 1
fi

# 1. 更新系统
echo ""
echo "[1/8] 更新系统软件包..."
apt update &amp;&amp; apt upgrade -y

# 2. 安装依赖
echo ""
echo "[2/8] 安装系统依赖..."
apt install -y python3 python3-venv python3-pip nodejs npm nginx git

# 3. 克隆或复制项目
echo ""
echo "[3/8] 设置项目目录..."
if [ ! -d "$PROJECT_DIR" ]; then
    echo "请将项目文件上传到 $PROJECT_DIR，或修改此脚本以克隆 git 仓库"
    echo "示例：git clone &lt;your-repo-url&gt; $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR

# 4. 设置后端
echo ""
echo "[4/8] 设置后端..."
cd $PROJECT_DIR/backend

# 创建虚拟环境
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# 5. 设置前端
echo ""
echo "[5/8] 构建前端..."
cd $PROJECT_DIR/frontend
npm install
npm run build

# 6. 配置 Nginx
echo ""
echo "[6/8] 配置 Nginx..."
cat &gt; /etc/nginx/sites-available/ai-evaluation &lt;&lt; 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /opt/AI-Evaluation-Platform/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    client_max_body_size 20M;
}
EOF

# 启用站点
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi
ln -sf /etc/nginx/sites-available/ai-evaluation /etc/nginx/sites-enabled/

# 测试 Nginx 配置
nginx -t

# 7. 创建 systemd 服务
echo ""
echo "[7/8] 创建后端服务..."
cat &gt; /etc/systemd/system/ai-evaluation-backend.service &lt;&lt; 'EOF'
[Unit]
Description=AI Evaluation Platform Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/AI-Evaluation-Platform/backend
Environment="PATH=/opt/AI-Evaluation-Platform/backend/venv/bin"
ExecStart=/opt/AI-Evaluation-Platform/backend/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000 app.main:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 设置权限
chown -R www-data:www-data $PROJECT_DIR

# 8. 启动服务
echo ""
echo "[8/8] 启动服务..."
systemctl daemon-reload
systemctl enable ai-evaluation-backend
systemctl start ai-evaluation-backend
systemctl reload nginx

echo ""
echo "========================================="
echo "   部署完成！"
echo "========================================="
echo ""
echo "访问地址：http://$(hostname -I | awk '{print $1}')"
echo ""
echo "后端服务状态：systemctl status ai-evaluation-backend"
echo "查看后端日志：journalctl -u ai-evaluation-backend -f"
echo "查看 Nginx 日志：tail -f /var/log/nginx/error.log"
echo ""
echo "下一步："
echo "1. 访问平台，注册第一个用户（将自动成为管理员）"
echo "2. 在系统配置中设置 Dify 和通义千问的 API 密钥"
echo "3. 导入测试集并开始测试"
echo ""
