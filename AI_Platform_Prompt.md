你是一名资深全栈架构师 + AI工程专家，请帮我开发一个“AI运维评测平台（AIOps Evaluation Platform）”。

# 一、项目目标
构建一个用于评测Dify运维智能体能力的自动化测试平台，实现：
- 100问自动测试
- LLM自动评分（AI Judge）
- 可视化测试报告
- 多版本对比分析

# 二、技术要求
请使用以下技术栈：
- 后端：Python（FastAPI）
- 前端：React + Tailwind + Echarts
- 数据存储：SQLite（可扩展PostgreSQL）
- 调用接口：
  - Dify API（获取回答）
  - 通义千问 API（评分模型） 

# 三、核心功能模块

## 1. 测试集管理模块
功能：
- 支持导入JSON格式测试集
- 支持增删改查测试问题
- 字段结构如下：
{
  id: string,
  question: string,
  standard_answer: string,
  keywords: string[],
  category: string
}

## 2. 自动测试引擎（核心）
流程：
1. 遍历测试集（100问）
2. 调用Dify API获取回答
3. 调用GPT进行评分
4. 存储结果

评分维度（4个维度，总分100分）
  - 准确性 (accuracy) - 40分：回答是否符合事实，与标准答案是否一致
  - 完整性 (completeness) - 30分：回答是否涵盖了问题的所有方面
  - 可操作性 (actionability) - 20分：回答是否具体可行，有明确的操作指导
  - 一致性 (consistency) - 10分：回答是否逻辑自洽，没有自相矛盾


## 3. AI评分模块（LLM Judge）
请封装一个评分函数：
输入：
- question
- standard_answer
- ai_answer

输出JSON：
{
  accuracy: number,
  completeness: number,
  actionability: number,
  issues: string,
  total_score: number
}

评分必须稳定、可复现（温度设为0）

## 4. 测试报告模块
输出内容：

### 总览：
- 平均分
- 各维度得分
- 幻觉率（错误回答占比）

### 分类统计：
- 按category统计平均分

### 明细：
- 每个问题的：
  - AI回答
  - 得分
  - 问题分析

## 5. 可视化Dashboard（前端）
必须包含：

- 总分卡片（Score Card）
- 雷达图（评分维度）
- 分类柱状图
- 分数分布图
- 问题明细表（支持搜索）

## 6. 历史版本对比（高级功能）
- 支持保存每次测试结果
- 支持对比：
  - 平均分变化
  - 分类变化
  - 低分问题变化

# 四、系统架构设计

请输出完整架构：

- API结构（FastAPI）
- 前后端交互接口
- 数据库表结构（至少3张表）：
  - datasets
  - test_results
  - test_runs

# 五、关键代码实现（必须提供）

请生成以下代码：

1. FastAPI主程序（可运行）
2. Dify调用封装
3. GPT评分函数
4. 自动测试调度函数
5. SQLite建表SQL
6. React前端页面（Dashboard）

# 六、工程要求

- 项目结构清晰（backend / frontend）
- 提供README说明如何启动
- 所有代码可运行（不要伪代码）
- 所有API有清晰路径说明

# 七、进阶要求（加分项）

如果可以，请增加：
- 并发测试（提升速度）
- 测试进度条
- 错误重试机制
- 日志记录

# 八、输出方式

请按以下顺序输出：

1. 项目结构
2. 后端代码
3. 前端代码
4. 启动说明
5. 示例测试集JSON

注意：
代码必须完整，不要省略，不要只给片段。
UI风格偏企业级（类似Datadog / Grafana），简洁专业