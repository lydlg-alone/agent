# AI 学习多智能体工作台

一个基于 `Electron + Vue 3 + Express + SQLite` 的本地学习工作台，支持聊天问答、知识库导入、学习工作流、统计分析，以及面向大模型的工具调用、联网搜索、结构化输出、混合检索和图片识别输入。

## 当前能力

- 本地桌面端运行，前端、后端和 Electron 打包在同一项目内
- 聊天工作区支持历史会话、附件上传、快捷提示词和引用展示
- 知识库支持文本文件导入、URL 网页导入、文档切片和本地检索
- 支持五个对话能力开关
  - `工具`：允许模型调用本地工具
  - `联网`：允许模型联网搜索公开网页
  - `结构化`：要求模型返回 JSON 结构化结果
  - `混合检索`：启用关键词 + 向量 + rerank 检索
  - `识图`：将图片附件作为视觉输入传给支持视觉的模型
- 学习工作流支持诊断、计划、资源生成、练习题和反馈
- 统计页支持会话、消息、知识库和练习数据概览
- Markdown / 代码高亮 / LaTeX 渲染

## 新增能力说明

本次已接入并可直接使用的增强能力：

1. 工具调用 + 结构化输出
   - 后端支持 `search_knowledge` 与 `web_search` 两类工具调用
   - 启用 `结构化` 后，请求会附带 JSON 输出约束
2. 网页搜索 + URL 导入
   - 聊天中可启用联网搜索
   - 知识库页面支持直接输入 URL 导入网页正文
3. 向量检索 / 混合检索 / rerank
   - 检索已从纯 FTS5 升级为关键词召回 + 本地轻量向量 + rerank
4. 图片解码与视觉输入
   - 图片附件会保存为 data URL
   - 启用 `识图` 时，系统会按多模态 `image_url` 格式把图片发给模型

## 目录结构

```text
.
├─ 1/
│  ├─ electron/                  Electron 主进程与 preload
│  ├─ renderer/                  Vue 3 前端
│  │  └─ src/
│  │     ├─ components/workspace/
│  │     ├─ services/
│  │     ├─ stores/
│  │     ├─ styles/
│  │     ├─ utils/
│  │     └─ views/
│  ├─ server/                    Express 后端
│  │  └─ src/
│  │     ├─ config/
│  │     ├─ db/
│  │     ├─ routes/
│  │     ├─ services/
│  │     ├─ test/
│  │     └─ utils/
│  └─ package.json
├─ README.md
├─ API文档.md
├─ 维护文档.md
└─ 详细技术说明文档.md
```

## 运行要求

- Windows 10/11
- Node.js `>= 18.18.0`
- npm `>= 9`

当前项目已在本机验证通过：

- `npm run build`
- `npm test`

## 安装与启动

进入实际应用目录：

```powershell
cd "F:\AI 学习多智能体工作台\agent-main\1"
```

安装依赖：

```powershell
npm install
```

启动开发环境：

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm run dev
```

说明：

- 当前 Electron 启动前建议先清理 `ELECTRON_RUN_AS_NODE` 环境变量，否则桌面窗口可能起不来
- `npm run dev` 会同时启动：
  - Vite 前端
  - Express 后端
  - Electron 桌面进程

默认端口：

- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:3001`

## 其他脚本

构建：

```powershell
cd "F:\AI 学习多智能体工作台\agent-main\1"
npm run build
```

测试：

```powershell
cd "F:\AI 学习多智能体工作台\agent-main\1"
npm test
```

## 关键实现位置

- 聊天与工具调用：`1/server/src/services/chatWorkspaceService.js`
- 混合检索：`1/server/src/services/ragService.js`
- 网页抓取与搜索：`1/server/src/services/webToolService.js`
- 知识库导入：`1/server/src/services/knowledgeBaseService.js`
- 聊天输入区：`1/renderer/src/components/workspace/ComposerPanel.vue`
- 知识库列表：`1/renderer/src/components/workspace/KnowledgeList.vue`

## 配置与数据

运行时模型配置默认保存在：

```text
文档\agent API\runtime-config.json
```

SQLite 数据库默认位于：

```text
1/server/data/app.db
```

数据库中与本次新增能力相关的关键字段：

- `chat_attachments.content_data`
- `document_chunks.embedding_json`

## 已知注意事项

- `识图` 只有在当前模型本身支持视觉输入时才会生效
- `联网` 依赖外部网络可访问 DuckDuckGo 结果页和目标网页
- 启用 `工具` 或 `结构化` 时，回复会走工具/整合逻辑，观感上可能与普通流式回答略有不同
- URL 导入目前提取的是网页正文文本，不保留复杂版式

## 文档索引

- 接口说明见 [API文档.md](./API文档.md)
- 维护说明见 [维护文档.md](./维护文档.md)
- 架构与实现细节见 [详细技术说明文档.md](./详细技术说明文档.md)
