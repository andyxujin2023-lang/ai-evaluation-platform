
# 版本更新指南

本文档说明如何从旧版本更新到新版本。

## 准备工作

1. **备份数据库**（非常重要！）
```bash
cd /opt/AI-Evaluation-Platform/backend
cp ai_evaluation.db ai_evaluation.db.backup.$(date +%Y%m%d_%H%M%S)
```

2. **查看当前版本**
```bash
cd /opt/AI-Evaluation-Platform
git log --oneline -1
```

## 更新步骤

### 方式一：Git 更新（推荐）

1. **拉取最新代码**
```bash
cd /opt/AI-Evaluation-Platform
git fetch origin
git checkout master
git pull origin master
```

2. **运行数据库迁移**
```bash
cd /opt/AI-Evaluation-Platform/backend

# 激活虚拟环境
source venv/bin/activate  # Linux
# 或
venv\Scripts\activate  # Windows

# 运行迁移脚本
python migrate_add_auth.py
python migrate_system_config.py
python migrate_sessions.py
```

3. **更新后端依赖**
```bash
cd /opt/AI-Evaluation-Platform/backend
source venv/bin/activate
pip install -r requirements.txt
```

4. **重新构建前端**
```bash
cd /opt/AI-Evaluation-Platform/frontend
npm install
npm run build
```

5. **重启服务**

**使用 systemd（Linux）：**
```bash
sudo systemctl restart ai-evaluation-backend
sudo systemctl reload nginx
```

**使用 PM2：**
```bash
pm2 restart ai-evaluation-backend
pm2 restart ai-evaluation-frontend  # 如果使用PM2管理前端
```

### 方式二：全量更新（如果Git不可用）

1. **上传新代码到服务器**
   - 将本地打包的新版本上传到服务器
   - 或使用 scp/rsync 同步

2. **备份当前版本**
```bash
cd /opt
mv AI-Evaluation-Platform AI-Evaluation-Platform.backup
```

3. **解压新版本**
```bash
cd /opt
unzip ai-evaluation-platform-new.zip -d AI-Evaluation-Platform
# 或
tar -xzf ai-evaluation-platform-new.tar.gz
```

4. **恢复数据库和配置**
```bash
cd /opt/AI-Evaluation-Platform/backend
cp ../../AI-Evaluation-Platform.backup/backend/ai_evaluation.db .
cp ../../AI-Evaluation-Platform.backup/backend/.env . 2&gt;/dev/null || true
```

5. **运行数据库迁移**（见方式一第2步）

6. **安装依赖并构建**（见方式一第3-4步）

7. **重启服务**（见方式一第5步）

## 数据库迁移说明

本次更新包含以下迁移脚本：

### 1. `migrate_add_auth.py`
- 添加用户表（users）
- 添加组织表（organizations）
- 添加会话表（sessions）
- 为现有数据创建默认组织和管理员用户

### 2. `migrate_system_config.py`
- 重构系统配置表（system_config）
- 添加 organization_id 列
- 迁移旧配置到组织级别

### 3. `migrate_sessions.py`
- 为 sessions 表添加 switch_organization_id 列
- 支持管理员切换组织功能

## 验证更新

1. **检查服务状态**
```bash
# 后端
sudo systemctl status ai-evaluation-backend

# Nginx
sudo systemctl status nginx
```

2. **查看日志**
```bash
# 后端日志
sudo journalctl -u ai-evaluation-backend -n 50 -f

# Nginx日志
sudo tail -f /var/log/nginx/error.log
```

3. **访问应用**
打开浏览器访问你的域名，检查：
- 可以看到登录/注册页面
- 可以注册新用户
- 可以登录并访问所有功能
- 可以创建测试批和测试集
- 可以运行测试

## 回滚步骤

如果更新出现问题，可以回滚：

### 使用Git回滚
```bash
cd /opt/AI-Evaluation-Platform
git reflog  # 查看历史
git reset --hard &lt;之前的commit-hash&gt;
```

### 使用备份回滚
```bash
cd /opt
mv AI-Evaluation-Platform AI-Evaluation-Platform.failed
mv AI-Evaluation-Platform.backup AI-Evaluation-Platform

# 恢复数据库
cd AI-Evaluation-Platform/backend
cp ai_evaluation.db.backup.&lt;日期&gt; ai_evaluation.db

# 重启服务
sudo systemctl restart ai-evaluation-backend
```

## 新功能说明

### 用户认证
- 用户注册和登录
- Session-based 认证
- 角色权限控制（admin/user）

### 组织管理
- 多租户数据隔离
- 组织CRUD
- 用户可切换组织（管理员）

### 用户管理
- 查看用户列表
- 修改用户角色
- 修改用户所属组织
- 启用/禁用用户

### 部署相关
- DEPLOY.md - 完整部署指南
- deploy.sh - Linux一键部署脚本
- deploy.bat - Windows快速部署脚本

## 注意事项

1. **首次登录**
   - 更新后，第一个注册的用户将成为管理员
   - 或者使用迁移脚本创建的默认管理员账号

2. **API密钥配置**
   - 系统配置现在是组织级别
   - 需要在"系统配置"页面重新设置Dify和通义千问的API密钥

3. **数据隔离**
   - 所有现有数据会迁移到默认组织
   - 新创建的数据会按组织隔离

## 需要帮助？

如果更新过程中遇到问题：
1. 查看服务日志
2. 检查数据库是否正常
3. 确认端口没有被占用
4. 查看GitHub上的Issue或提交新Issue
