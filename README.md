# AI 学习多智能体工作台

本项目是一个基于 `Electron + Vue 3 + Node.js + SQLite` 的桌面端学习系统，围绕"模型配置、知识库、智能体编排、聊天协作、RAG 检索增强、资源生成、练习反馈"构建本地化学习闭环。

当前代码已落地为一个可运行的桌面应用原型，包含真实前后端分层、数据库持久化、聊天工作区页面、RAG 文档解析与检索召回、本地 API 服务。

## 1. 当前能力

### 1.1 聊天 / 多智能体学习空间

- 默认首页为聊天工作区（单页应用，侧边导航切换模块）
- 显示当前默认模型
- 显示多智能体协同状态（知识库状态、模型、工作智能体、接口接入）
- 支持新建会话、切换会话、重命名会话、删除会话
- 支持清空当前会话
- 支持输入学习指令，Enter 发送，Shift+Enter 换行
- 支持上传附件（PDF / Word / Markdown / TXT / JSON / CSV 等）
- 消息、附件、协同状态写入本地数据库
- 支持接入 DeepSeek / OpenAI-Compatible 外部模型进行真实推理

### 1.2 RAG 检索增强闭环

- 上传 PDF / DOCX 自动解析为纯文本（服务端 pdf-parse + mammoth）
- Markdown / TXT 直接读取内容
- 自动切块（段落感知滑窗，~500 字/块，100 字重叠）
- SQLite FTS5 全文索引，BM25 相关性排序
- 发送消息时自动检索相关文档片段，注入 LLM 上下文
- 聊天回答下方展示"参考来源"卡片，列出引用文件名和片段

### 1.3 模型配置

- 新增模型配置（支持 DeepSeek、Qwen、OpenAI-Compatible 等）
- 查看模型列表
- 设置默认模型
- 自动检测模型（从 API 识别模型 ID）
- 测试模型连通性

### 1.4 知识库管理

- 创建知识库
- 导入本地文档（PDF / Word / Markdown，自动解析+切块+索引）
- 搜索文档
- 删除/清空文档（自动清理关联的 RAG 切块）

### 1.5 智能体市场

- 切换学习智能体（综合学习、政治知识、编程训练等）
- 显示智能体擅长范围和知识范围
- 启动时自动补齐聊天工作区所需的检索/规划智能体

### 1.6 学习工作流

- 学情诊断
- 学习规划
- 学习资源生成
- 练习题生成
- 自动反馈

## 2. 技术栈

- 桌面端：Electron
- 前端：Vue 3 + Vite + Vue Router + Pinia + Element Plus
- 后端：Node.js + Express
- 数据库：SQLite + better-sqlite3 + FTS5 全文搜索
- 文档解析：pdf-parse + mammoth
- 通信方式：前端通过 HTTP 调用本地 `/api` 接口

## 3. 项目结构

```text
1/
├─ electron/                  Electron 主进程与 preload
├─ renderer/                  前端工程
│  ├─ index.html              Vite 入口页，挂载 Vue 应用
│  └─ src/
│     ├─ components/          通用组件 + workspace 子组件
│     │  └─ workspace/         ChatHistoryPanel / ChatPane / ComposerPanel / StatusPanel / ...
│     ├─ composables/         组合式函数
│     ├─ router/              路由配置
│     ├─ services/            API 请求封装
│     ├─ stores/              Pinia 状态
│     ├─ styles/              全局主题
│     ├─ utils/               工具函数（含 RAG 引用渲染）
│     └─ views/               页面视图（StudyWorkspaceView 为主入口）
├─ server/
│  ├─ data/                   SQLite 数据文件
│  └─ src/
│     ├─ config/              环境与数据库初始化
│     ├─ data/                种子数据
│     ├─ db/                  建表脚本（含 FTS5 全文索引）
│     ├─ routes/              API 路由
│     ├─ services/            业务服务（含 RAG 三件套）
│     └─ utils/               工具方法
├─ package.json
└─ vite.config.js
```

## 4. 页面与路由

当前前端使用单页应用模式，路由为 `/`→`StudyWorkspaceView.vue`，内部通过侧边导航切换四个模块：

- 聊天（默认首页）
- 知识库
- 智能体
- 设置（模型配置 + API 接入）

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

聊天工作区已实现：

- 工作区状态
- 会话创建、查询、重命名、删除
- 会话清空
- 附件上传（支持 PDF/DOCX 自动解析+切块+索引）
- 消息发送（含 RAG 检索召回 + 引用返回）

## 7. 数据库

数据库文件默认位于：

```text
1/server/data/app.db
```

当前已落地的主要数据表：

- `model_configs`
- `knowledge_bases`
- `knowledge_documents`
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
- `document_chunks`（RAG 切块存储）
- `document_chunks_fts`（FTS5 全文检索）

## 8. 当前实现边界

当前已经完成：

- Electron 桌面壳
- Vue 前端页面（单页应用）
- Express 本地 API
- SQLite 建表与种子数据
- 聊天工作区和消息持久化
- 会话重命名、删除、清空
- 附件登记与会话关联
- PDF / DOCX 文档解析与文本提取
- 文档自动切块与 FTS5 全文索引
- RAG 检索召回与引用展示
- 外部模型接入（DeepSeek / OpenAI-Compatible）

当前仍为示例或占位实现的部分：

- 用户登录鉴权
- 导出 PDF / Word / Markdown
- 打包发布与自动更新

## 9. 后续建议

优先级建议如下：

1. 引入向量检索（sqlite-vec）替代纯关键词 FTS5，提升召回精度
2. 为更多智能体建立独立 Prompt 与执行链路
3. 增加导出报告、日志、打包和自动更新能力
4. 支持更多文档格式（PPT、XLSX 等）

## 10. 相关文档

- [API文档.md](./API文档.md)
- [维护文档.md](./维护文档.md)
- [详细技术说明文档.md](./详细技术说明文档.md)
