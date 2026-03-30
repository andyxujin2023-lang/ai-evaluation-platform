
# 部署指南

本文档说明如何将 AI 运维评测平台部署到服务器。

## 前提条件

- 服务器操作系统：Ubuntu 20.04+ / CentOS 7+ / Windows Server
- Python 3.8+
- Node.js 16+
- 可用的端口：8000（后端）、3000（前端）或其他自定义端口

## 一、代码上传

### 方式一：Git 上传（推荐）

```bash
# 在服务器上
cd /opt
git clone &lt;你的仓库地址&gt;
cd AI-Evaluation-Platform
```

### 方式二：直接上传文件

将本地项目文件夹打包上传到服务器，解压到 `/opt/AI-Evaluation-Platform`

## 二、后端部署

### 1. 安装 Python 依赖

```bash
cd /opt/AI-Evaluation-Platform/backend

# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件（如果需要）
# 注意：现在系统配置已移至数据库，.env 仅用于开发时的默认值
```

### 3. 初始化数据库

```bash
# 数据库会在首次启动时自动初始化
# 如果有旧数据库需要迁移，运行：
python migrate_add_auth.py
python migrate_system_config.py
python migrate_sessions.py
```

### 4. 使用 Gunicorn 部署（生产环境推荐）

安装 Gunicorn：
```bash
pip install gunicorn
```

创建启动脚本 `start_backend.sh`：
```bash
#!/bin/bash
cd /opt/AI-Evaluation-Platform/backend
source venv/bin/activate
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app
```

创建 systemd 服务（Linux）：
```bash
sudo nano /etc/systemd/system/ai-evaluation-backend.service
```

内容：
```ini
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
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-evaluation-backend
sudo systemctl start ai-evaluation-backend
sudo systemctl status ai-evaluation-backend
```

### 5. 或使用 PM2 部署（跨平台）

```bash
npm install -g pm2

cd /opt/AI-Evaluation-Platform/backend
pm2 start "gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app" --name ai-evaluation-backend
pm2 save
pm2 startup
```

## 三、前端部署

### 1. 构建前端

```bash
cd /opt/AI-Evaluation-Platform/frontend
npm install
npm run build
```

构建完成后，会生成 `dist` 目录。

### 2. 使用 Nginx 部署（推荐）

安装 Nginx：
```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

创建配置文件：
```bash
sudo nano /etc/nginx/sites-available/ai-evaluation
```

内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或服务器IP

    # 前端静态文件
    location / {
        root /opt/AI-Evaluation-Platform/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 客户端最大上传大小
    client_max_body_size 20M;
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/ai-evaluation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 或使用 PM2 部署简单的 HTTP 服务器

```bash
cd /opt/AI-Evaluation-Platform/frontend
npm install -g serve
pm2 serve dist 3000 --name ai-evaluation-frontend
pm2 save
```

## 四、防火墙配置

### Ubuntu/Debian (UFW)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### CentOS/RHEL (firewalld)
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 五、SSL 证书配置（可选但推荐）

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

证书会自动续期。

## 六、数据备份

### 备份数据库
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /opt/AI-Evaluation-Platform/backend/ai_evaluation.db $BACKUP_DIR/ai_evaluation_$DATE.db
# 只保留最近 7 天的备份
find $BACKUP_DIR -name "ai_evaluation_*.db" -mtime +7 -delete
```

添加到 crontab：
```bash
crontab -e
# 每天凌晨 2 点备份
0 2 * * * /opt/AI-Evaluation-Platform/backup.sh
```

## 七、更新部署

### 拉取最新代码
```bash
cd /opt/AI-Evaluation-Platform
git pull origin main
```

### 更新后端
```bash
cd /opt/AI-Evaluation-Platform/backend
source venv/bin/activate
pip install -r requirements.txt
# 运行数据库迁移（如果有）
python migrate_xxx.py
# 重启服务
sudo systemctl restart ai-evaluation-backend
```

### 更新前端
```bash
cd /opt/AI-Evaluation-Platform/frontend
npm install
npm run build
sudo systemctl reload nginx
```

## 八、故障排查

### 查看后端日志
```bash
# systemd
sudo journalctl -u ai-evaluation-backend -f

# PM2
pm2 logs ai-evaluation-backend
```

### 查看 Nginx 日志
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 检查端口占用
```bash
netstat -tlnp | grep -E ':(8000|3000|80|443)'
```

## 九、Windows 服务器部署

### 使用 IIS 部署前端
1. 安装 IIS
2. 安装 URL Rewrite Module
3. 创建网站，指向 `frontend/dist` 目录
4. 添加 web.config（处理 SPA 路由）

### 使用 Windows 服务部署后端
可以使用 NSSM (Non-Sucking Service Manager) 将 Python 程序注册为 Windows 服务。

---

## 部署检查清单

- [ ] 代码已上传到服务器
- [ ] 后端依赖已安装
- [ ] 数据库已初始化/迁移
- [ ] 后端服务已启动并运行在 8000 端口
- [ ] 前端已构建
- [ ] Nginx 已配置并启动
- [ ] 防火墙已开放 80/443 端口
- [ ] SSL 证书已配置（可选）
- [ ] 数据备份脚本已设置
- [ ] 可以通过浏览器访问
- [ ] 可以注册/登录
- [ ] 可以创建测试批和测试集
- [ ] 可以运行测试并生成报告
