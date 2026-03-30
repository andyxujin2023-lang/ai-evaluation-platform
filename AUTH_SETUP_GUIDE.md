# 用户认证系统设置指南

## 概述

我们已成功为 AI 运维评测平台添加了完整的用户认证和授权系统，包括：

- ✅ 用户注册和登录（基于 Session Cookie）
- ✅ 组织/团队数据隔离
- ✅ 角色权限控制（管理员/普通用户）
- ✅ 用户管理功能（仅管理员）

---

## 快速开始

### 1. 安装新依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 数据库迁移

**重要：先备份现有数据库！**

```bash
cd backend
python migrate_add_auth.py
```

### 3. 初始化新数据库（如果是全新部署）

```bash
cd backend
python init_db.py
```

### 4. 启动后端服务

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

---

## 使用流程

### 第一个用户注册

1. 访问 `http://localhost:5173/register`
2. 填写信息：
   - 姓名
   - 邮箱
   - 密码
   - **创建新组织**（填写组织名称和标识）
3. 点击"创建账户"
4. 第一个用户自动成为该组织的管理员

### 后续用户注册

**方式一：管理员创建**
1. 登录管理员账户
2. 进入"用户管理"页面
3. 点击"添加用户"
4. 填写新用户信息

**方式二：用户自行注册并加入现有组织**
1. 访问注册页面
2. 选择"加入现有组织"
3. 输入组织 ID（向管理员索取）
4. 完成注册

### 登录

1. 访问 `http://localhost:5173/login`
2. 输入邮箱和密码
3. 点击登录

---

## 权限说明

### 管理员权限
- ✅ 所有普通用户权限
- ✅ 用户管理（添加、删除、修改角色、启用/禁用）
- ✅ 修改其他用户的角色

### 普通用户权限
- ✅ 创建和管理测试批
- ✅ 导入和管理测试集
- ✅ 运行测试
- ✅ 查看测试报告
- ✅ 修改自己的姓名

### 数据隔离
- 每个组织的数据完全隔离
- 用户只能看到自己组织的测试批、测试集和测试结果
- 不同组织之间数据互不可见

---

## API 端点说明

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 用户管理（仅管理员）
- `GET /api/users` - 获取组织内所有用户
- `GET /api/users/{id}` - 获取用户详情
- `POST /api/users` - 创建新用户
- `PUT /api/users/{id}` - 更新用户信息
- `DELETE /api/users/{id}` - 删除用户

---

## 安全特性

1. **密码加密**：使用 bcrypt 安全哈希
2. **Session Cookie**：HttpOnly、SameSite=Lax 标志
3. **会话过期**：7天自动过期
4. **权限检查**：所有 API 端点都有适当的权限验证

---

## 注意事项

1. **现有数据迁移**：运行迁移脚本后，现有数据将没有 `organization_id`，需要手动分配或重新创建
2. **第一个用户**：第一个注册的用户自动成为组织管理员
3. **不能删除自己**：管理员不能删除自己的账户
4. **CORS 配置**：已更新 CORS 配置，开发环境支持 localhost:5173 和 localhost:3000

---

## 故障排查

### 登录后跳转回登录页
- 检查后端是否正常运行
- 查看浏览器开发者工具的 Network 标签，检查 API 请求
- 确认 Cookie 是否正确设置

### 注册时提示"邮箱已被注册"
- 使用该邮箱登录，或使用其他邮箱

### 数据库迁移失败
- 确保已备份数据库
- 检查数据库文件权限
- 查看错误信息

---

## 已更新/创建的文件清单

### 后端
- `backend/requirements.txt` - 添加 bcrypt
- `backend/init_db.sql` - 更新数据库架构
- `backend/migrate_add_auth.py` - 数据库迁移脚本（新）
- `backend/app/core/auth.py` - 认证核心模块（新）
- `backend/app/models/schemas.py` - 添加用户/组织模型
- `backend/app/api/auth.py` - 认证 API（新）
- `backend/app/api/users.py` - 用户管理 API（新）
- `backend/app/api/test_batches.py` - 添加认证和组织隔离
- `backend/app/main.py` - 注册新路由，更新 CORS

### 前端
- `frontend/src/api/index.js` - 添加认证 API，启用 withCredentials
- `frontend/src/contexts/AuthContext.jsx` - 认证上下文（新）
- `frontend/src/components/ProtectedRoute.jsx` - 路由保护（新）
- `frontend/src/pages/Login.jsx` - 登录页面（新）
- `frontend/src/pages/Register.jsx` - 注册页面（新）
- `frontend/src/pages/UserManagement.jsx` - 用户管理页面（新）
- `frontend/src/App.jsx` - 集成认证系统
