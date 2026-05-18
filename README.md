# AI 学习多智能体工作台

本项目是一个基于 `Electron + Vue 3 + Node.js + SQLite` 的桌面端学习系统，围绕“模型配置、知识库、智能体编排、聊天协作、资源生成、练习反馈”构建本地化学习闭环。

当前代码已落地为一个可运行的桌面应用原型，包含真实前后端分层、数据库持久化、聊天工作区页面和本地 API 服务。

## 1. 当前能力

### 1.1 聊天 / 多智能体学习空间

- 默认首页为聊天工作区
- 显示当前默认模型
- 显示多智能体协同状态
- 支持新建会话、切换会话
- 支持输入学习指令
- 支持上传附件并绑定到消息
- 消息、附件、协同状态写入本地数据库

当前内置两类协同智能体：

- 检索智能体
- 规划智能体

### 1.2 模型配置

- 新增模型配置
- 查看模型列表
- 设置默认模型
- 测试模型连通性示例接口

### 1.3 知识库管理

- 创建知识库
- 记录知识库文档
- 执行检索测试示例接口

### 1.4 智能体编排

- 创建智能体
- 配置角色、模型绑定、提示词模板、知识范围
- 启动时自动补齐聊天工作区所需的检索/规划智能体

### 1.5 学习工作流

- 学情诊断
- 学习规划
- 学习资源生成
- 练习题生成
- 自动反馈

### 1.6 数据看板

- 展示模型、知识库、智能体、资源统计
- 展示工作流摘要和趋势数据

## 2. 技术栈

- 桌面端：Electron
- 前端：Vue 3 + Vite + Vue Router + Pinia + Element Plus
- 后端：Node.js + Express
- 数据库：SQLite + better-sqlite3
- 通信方式：前端通过 HTTP 调用本地 `/api` 接口

## 3. 项目结构

```text
1/
├─ electron/                  Electron 主进程与 preload
├─ renderer/                  前端工程
│  ├─ index.html              Vite 入口页，挂载 Vue 应用
│  └─ src/
│     ├─ components/          通用组件
│     ├─ layouts/             主布局
│     ├─ router/              路由配置
│     ├─ services/            API 请求封装
│     ├─ stores/              Pinia 状态
│     ├─ styles/              全局主题
│     └─ views/               页面视图
├─ server/
│  ├─ data/                   SQLite 数据文件
│  └─ src/
│     ├─ config/              环境与数据库初始化
│     ├─ data/                种子数据
│     ├─ db/                  建表脚本
│     ├─ routes/              API 路由
│     ├─ services/            业务服务
│     └─ utils/               工具方法
├─ package.json
└─ vite.config.js
```

## 4. 页面与路由

当前前端主要页面如下：

- `/`：聊天空间
- `/dashboard`：总览
- `/models`：模型配置
- `/knowledge`：知识库管理
- `/agents`：智能体编排
- `/learning`：学习资源生成
- `/practice`：练习与测评
- `/analytics`：数据可视化

## 5. 运行方式

进入项目目录 `1`：

```bash
npm install
npm run dev
```

也可以拆开运行：

```bash
npm run dev:renderer
npm run dev:server
npm run dev:electron
```

生产构建：

```bash
npm run build
```

## 6. 当前后端接口范围

当前已实现的接口类别：

- 健康检查：`/api/health`
- 总览：`/api/dashboard/summary`
- 模型：`/api/models`
- 知识库：`/api/knowledge-bases`
- 智能体：`/api/agents`
- 学习工作流：`/api/workflows/*`
- 聊天工作区：`/api/chat/*`

聊天工作区已新增：

- 工作区状态
- 会话创建与查询
- 附件上传登记
- 消息发送与协同状态返回

## 7. 数据库

数据库文件默认位于：

```text
1/server/data/app.db
```

当前已落地的主要数据表：

- `model_configs`
- `knowledge_bases`
- `documents`
- `agents`
- `learning_plans`
- `generated_resources`
- `questions`
- `answers`
- `mistakes`
- `chat_sessions`
- `chat_messages`
- `chat_attachments`

## 8. 当前实现边界

当前已经完成：

- Electron 桌面壳
- Vue 前端页面
- Express 本地 API
- SQLite 建表与种子数据
- 聊天工作区和消息持久化
- 附件登记与会话关联

当前仍为示例或占位实现的部分：

- 真实第三方大模型调用
- 真实文件解析和向量化
- 真实 RAG 检索
- 用户登录鉴权
- 导出 PDF / Word / Markdown

## 9. 后续建议

优先级建议如下：

1. 接入真实 OpenAI-Compatible 聊天接口
2. 增加文档上传解析和结构化抽取
3. 引入向量检索，打通知识库召回
4. 为不同智能体建立独立 Prompt 与执行链路
5. 增加导出、日志、打包和自动更新能力

## 10. 相关文档

- [API文档.md](./API文档.md)
- [维护文档.md](./维护文档.md)
- [详细技术说明文档.md](./详细技术说明文档.md)
