# 部署指南

本文档说明如何将 AI 运维评测平台部署到生产服务器。

## 目录
- [服务器要求](#服务器要求)
- [快速部署](#快速部署)
- [手动部署步骤](#手动部署步骤)
- [配置 HTTPS](#配置-https)
- [备份与维护](#备份与维护)
- [常见问题](#常见问题)

---

## 服务器要求

### 最低配置
- **操作系统**: Ubuntu 20.04/22.04 LTS
- **CPU**: 2 核
- **内存**: 4 GB
- **磁盘**: 20 GB
- **网络**: 公网 IP

### 推荐配置
- **操作系统**: Ubuntu 22.04 LTS
- **CPU**: 4 核
- **内存**: 8 GB
- **磁盘**: 50 GB SSD
- **网络**: 公网 IP + 域名

---

## 快速部署

### 方式一：使用一键部署脚本（推荐）

1. **上传代码到服务器**
```bash
# 在服务器上
cd /var/www
sudo git clone <你的仓库地址> ai-evaluation-platform
# 或者使用 scp 本地上传
```

2. **运行部署脚本**
```bash
cd /var/www/ai-evaluation-platform/deploy
sudo chmod +x deploy.sh
sudo bash deploy.sh your-domain.com
```

3. **访问应用**
打开浏览器访问 `http://your-domain.com` 或服务器 IP

---

## 手动部署步骤

如果需要自定义部署，请按以下步骤操作：

### 1. 安装基础环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Python
sudo apt install -y python3 python3-pip python3-venv

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Nginx 和 Git
sudo apt install -y nginx git
```

### 2. 准备项目文件

```bash
# 创建项目目录
sudo mkdir -p /var/www
cd /var/www

# 克隆或上传项目
sudo git clone <你的仓库> ai-evaluation-platform
cd ai-evaluation-platform

# 设置权限
sudo chown -R $USER:$USER /var/www/ai-evaluation-platform
```

### 3. 配置后端

```bash
cd /var/www/ai-evaluation-platform/backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 初始化数据库
python init_db.py

# 设置权限
sudo chown -R www-data:www-data /var/www/ai-evaluation-platform/backend
```

### 4. 构建前端

```bash
cd /var/www/ai-evaluation-platform/frontend

# 安装依赖
npm install

# 构建生产版本
npm run build
```

### 5. 配置 Nginx

```bash
# 复制配置文件
sudo cp /var/www/ai-evaluation-platform/deploy/nginx.conf /etc/nginx/sites-available/ai-evaluation-platform

# 编辑配置，修改域名
sudo nano /etc/nginx/sites-available/ai-evaluation-platform

# 启用站点
sudo ln -s /etc/nginx/sites-available/ai-evaluation-platform /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 6. 配置 Systemd 服务

```bash
# 复制服务文件
sudo cp /var/www/ai-evaluation-platform/deploy/ai-evaluation-backend.service /etc/systemd/system/

# 编辑服务文件（如需要）
sudo nano /etc/systemd/system/ai-evaluation-backend.service

# 重新加载 systemd
sudo systemctl daemon-reload

# 启用并启动服务
sudo systemctl enable ai-evaluation-backend
sudo systemctl start ai-evaluation-backend

# 查看状态
sudo systemctl status ai-evaluation-backend
```

---

## 配置 HTTPS

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取并安装证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com

# 证书会自动续期，测试续期
sudo certbot renew --dry-run
```

Certbot 会自动修改 Nginx 配置文件添加 HTTPS 支持。

---

## 备份与维护

### 数据库备份

```bash
# 创建备份脚本
sudo nano /var/www/ai-evaluation-platform/backup.sh
```

添加以下内容：
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/ai-evaluation"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
cp /var/www/ai-evaluation-platform/backend/ai_evaluation.db $BACKUP_DIR/db_$DATE.db

# 保留最近 30 天的备份
find $BACKUP_DIR -name "db_*.db" -mtime +30 -delete
```

设置定时任务：
```bash
sudo chmod +x /var/www/ai-evaluation-platform/backup.sh
sudo crontab -e
# 添加每天凌晨 2 点备份
0 2 * * * /var/www/ai-evaluation-platform/backup.sh
```

### 查看日志

```bash
# 后端日志
sudo journalctl -u ai-evaluation-backend -f

# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 更新应用

```bash
cd /var/www/ai-evaluation-platform

# 拉取最新代码
git pull

# 更新后端依赖
cd backend
source venv/bin/activate
pip install -r requirements.txt

# 重新构建前端
cd ../frontend
npm install
npm run build

# 重启服务
sudo systemctl restart ai-evaluation-backend
sudo systemctl reload nginx
```

---

## 常见问题

### 1. 后端服务无法启动

```bash
# 查看详细日志
sudo journalctl -u ai-evaluation-backend -n 50

# 检查端口是否被占用
sudo netstat -tlnp | grep 8000

# 手动测试运行
cd /var/www/ai-evaluation-platform/backend
source venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. 502 Bad Gateway

通常是后端服务未运行：
```bash
sudo systemctl restart ai-evaluation-backend
sudo systemctl status ai-evaluation-backend
```

### 3. 上传文件大小限制

编辑 Nginx 配置，增加 `client_max_body_size`：
```nginx
client_max_body_size 100M;
```

### 4. 数据库权限问题

```bash
sudo chown -R www-data:www-data /var/www/ai-evaluation-platform/backend
sudo chmod 755 /var/www/ai-evaluation-platform/backend
sudo chmod 644 /var/www/ai-evaluation-platform/backend/ai_evaluation.db
```

### 5. 防火墙配置

```bash
# 检查防火墙状态
sudo ufw status

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 安全建议

1. **定期更新系统**
```bash
sudo apt update && sudo apt upgrade -y
```

2. **使用非 root 用户运行服务**
   配置文件已使用 www-data 用户

3. **配置防火墙**
   只开放必要端口（80, 443）

4. **禁用 SSH 密码登录**
   使用 SSH 密钥认证

5. **监控日志**
   定期检查访问日志和错误日志

6. **定期备份**
   确保备份脚本正常运行

---

## 联系支持

如遇到问题，请检查：
1. 系统日志 `journalctl -xe`
2. 应用日志 `journalctl -u ai-evaluation-backend`
3. Nginx 日志 `/var/log/nginx/`
