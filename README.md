# 基于大模型的智能体学习桌面应用

这是一个基于 `Electron + Vue 3 + Express + SQLite` 的本地桌面学习软件。项目围绕“学习工作区”展开，支持 AI 聊天、历史会话、知识库导入、检索增强回答、智能体切换，以及外部模型配置。

## 当前能力

- 学习工作区：固定布局聊天页，消息区独立滚动
- 历史会话：新建、切换、重命名、删除、清空
- 流式聊天：AI 回复按分片实时输出
- 知识库：导入文档、查看列表、删除文档、清空知识库
- 检索增强：上传资料后按分块建立索引，聊天时自动召回相关片段
- 引用展示：聊天回答可携带来源文档信息
- 智能体切换：工作区支持切换当前学习智能体
- 运行时配置：从系统“文档”目录读取和保存 API 配置
- 配置实时刷新：外部修改配置文件后，页面可自动同步

## 技术栈

- 桌面壳：Electron
- 前端：Vue 3、Vue Router、Pinia、Vite、Element Plus
- 后端：Express
- 数据库：SQLite、FTS5
- 文档解析：`pdf-parse`、`mammoth`

## 目录结构

```text
.
├─ 1/
│  ├─ electron/                 Electron 主进程与 preload
│  ├─ renderer/                 Vue 前端
│  │  ├─ src/components/workspace/
│  │  ├─ src/composables/
│  │  ├─ src/services/
│  │  └─ src/stores/
│  ├─ server/                   Express 后端
│  │  ├─ src/routes/
│  │  ├─ src/services/
│  │  ├─ src/utils/
│  │  ├─ src/db/
│  │  └─ data/                  本地数据库目录
│  └─ package.json
├─ 前端设计/                     设计稿与原始静态页面
├─ README.md
├─ API文档.md
├─ 维护文档.md
└─ 详细技术说明文档.md
```

## 启动方式

在项目应用目录执行：

```powershell
cd "E:\基于Deepseek的智能体学习软件\1"
npm install
npm run dev
```

常用命令：

```powershell
npm run build
npm test
```

默认端口：

- 前端开发服务器：`5173`
- 后端接口服务：`3001`

## 配置与数据位置

运行时 API 配置不保存在项目目录内，而是保存在当前系统用户的“文档”目录：

```text
文档\agent API\runtime-config.json
```

说明：

- Windows 下会优先自动读取系统真实“文档”目录
- `API Key` 采用当前用户上下文保护，不再明文保存
- 本地数据库默认位于 `1/server/data/app.db`

## 主要页面

- 聊天页：历史会话、消息流式输出、附件上传、引用展示
- 知识库页：文档导入、检索列表、统计展示
- 智能体页：查看并切换当前学习智能体
- 设置页：配置模型提供方、接口地址、模型 ID、系统提示词

## 当前测试覆盖

项目已包含一组最小集成测试，覆盖以下核心链路：

- 聊天接口本地回复
- 聊天流式输出
- 知识库导入与查询
- 设置保存与读取
- 接口 schema 校验

执行命令：

```powershell
cd "E:\基于Deepseek的智能体学习软件\1"
npm test
```

## 补充文档

- 接口说明见 [API文档.md](./API文档.md)
- 维护说明见 [维护文档.md](./维护文档.md)
- 技术架构见 [详细技术说明文档.md](./详细技术说明文档.md)
