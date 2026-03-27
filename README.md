# AI 运维评测平台 (AIOps Evaluation Platform)

一个用于评测 Dify 运维智能体能力的自动化测试平台。

##系统界面
<img width="2127" height="1149" alt="image" src="https://github.com/user-attachments/assets/e33a5218-a898-4bca-939b-4380d0d3d1f9" />

## 功能特性

- 📝 **测试集管理** - 支持 JSON 格式导入，增删改查测试问题
- 🤖 **自动测试引擎** - 100 问自动化测试，调用 Dify API 获取回答
- ⚖️ **AI 评分模块** - 基于通义千问的 LLM Judge，多维度评分
- 📊 **可视化报告** - 雷达图、柱状图、分数分布图等
- 🔄 **版本对比** - 多版本测试结果对比分析

## 技术栈

### 后端
- Python 3.8+
- FastAPI
- SQLite

### 前端
- React 18
- Tailwind CSS
- ECharts
- Vite

## 快速开始

### 1. 环境配置

#### 后端配置

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 文件，填入你的 API 密钥
```

编辑 `.env` 文件：
```env
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=your_dify_api_key_here
TONGYI_API_KEY=your_tongyi_api_key_here
TONGYI_MODEL=qwen-max
```

#### 前端配置

```bash
cd frontend
npm install
```

### 2. 启动服务

#### 启动后端

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务将运行在 http://localhost:8000

API 文档：http://localhost:8000/docs

#### 启动前端

```bash
cd frontend
npm run dev
```

前端服务将运行在 http://localhost:3000

## 使用指南

### 1. 导入测试集

访问「测试集管理」页面，你可以：
- 手动添加单个问题
- 批量导入 JSON 格式的测试集

JSON 格式示例：
```json
[
  {
    "question": "如何查看系统CPU使用率？",
    "standard_answer": "可以使用 top、htop 或 mpstat 命令查看CPU使用率",
    "keywords": ["CPU", "top", "htop"],
    "category": "监控告警"
  }
]
```

### 2. 开始测试

访问「测试运行」页面，点击「开始新测试」，输入测试名称后即可启动自动测试。

### 3. 查看报告

测试完成后，点击测试记录的「查看」按钮，即可查看详细的测试报告，包括：
- 总分和各维度得分
- 分类统计
- 分数分布
- 每个问题的详细分析

## 项目结构

```
AI Evaluation Platform/
├── backend/
│   ├── app/
│   │   ├── api/           # API 路由
│   │   ├── core/          # 核心模块（配置、数据库）
│   │   ├── models/        # 数据模型
│   │   ├── services/      # 服务层
│   │   └── main.py        # FastAPI 主程序
│   ├── requirements.txt
│   ├── init_db.sql        # 数据库初始化脚本
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/           # API 客户端
│   │   ├── components/    # React 组件
│   │   ├── pages/         # 页面组件
│   │   ├── types/         # TypeScript 类型
│   │   └── main.jsx       # 入口文件
│   ├── package.json
│   └── vite.config.js
└── sample_test_set.json    # 示例测试集
```

## API 接口

### 测试集管理

- `GET /api/datasets` - 获取测试问题列表
- `POST /api/datasets` - 创建测试问题
- `POST /api/datasets/import` - 批量导入测试问题
- `PUT /api/datasets/{id}` - 更新测试问题
- `DELETE /api/datasets/{id}` - 删除测试问题

### 测试运行

- `GET /api/test-runs` - 获取测试运行列表
- `POST /api/test-runs` - 启动新测试
- `GET /api/test-runs/{id}` - 获取测试运行详情
- `GET /api/test-runs/{id}/report` - 获取测试报告
- `GET /api/test-runs/{id}/progress` - 获取测试进度
- `DELETE /api/test-runs/{id}` - 删除测试运行

## 评分说明

评分分为四个维度：

- **准确性 (40%)** - 回答是否符合事实，与标准答案一致
- **完整性 (30%)** - 回答是否涵盖问题的所有方面
- **可操作性 (20%)** - 回答是否具体可行，有明确操作指导
- **一致性 (10%)** - 回答是否逻辑自洽，无自相矛盾

## 许可证

MIT License
