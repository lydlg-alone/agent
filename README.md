# AI 学习多智能体工作台

基于 `Electron + Vue 3 + Express + SQLite` 的本地桌面学习工作台，集成聊天问答、知识库、学习工作流、模型配置、多会话附件，以及图片 OCR 与视觉输入兼容处理。

## 当前版本重点

- 聊天工作区支持多会话、会话重命名、会话清空、会话删除。
- 输入框支持多文件上传，上传后会显示附件卡片，可单独删除。
- 已发送消息会在聊天气泡中展示附件卡片。
- 图片附件会优先做 OCR 提取文字，再作为附件上下文参与后续问答。
- 如果当前模型支持视觉输入，系统可发送 `image_url` 多模态消息。
- 如果当前模型不支持视觉输入，系统会自动降级为纯文本上下文，避免 `unknown variant 'image_url'` 之类的接口报错。
- 工具调用、混合检索、图片识别能力在前端默认自动开启。
- 用户界面当前保留两个可见开关：
  - `联网`：启用网页搜索
  - `结构化`：要求模型返回更规整的结构化结果

## 目录结构

```text
.
├─ 1/
│  ├─ electron/                  Electron 主进程与 preload
│  ├─ renderer/                  Vue 3 前端
│  │  └─ src/
│  ├─ server/                    Express 后端
│  │  ├─ src/
│  │  └─ data/
│  ├─ scripts/
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

## 快速开始

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
npm run dev
```

说明：

- `npm run dev` 会并行启动前端、后端和 Electron。
- 当前 `dev:electron` 已通过 `scripts/start-electron.cjs` 自动清理 `ELECTRON_RUN_AS_NODE`，一般不需要手动处理该环境变量。
- 默认端口：
  - 前端：`http://127.0.0.1:5173`
  - 后端：`http://127.0.0.1:3001`

## 常用脚本

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

## 主要能力

- 聊天与会话管理
  - 历史会话列表
  - 新建、重命名、清空、删除会话
  - 普通回复和 SSE 流式回复
- 附件能力
  - 输入区附件卡片展示
  - 聊天气泡附件卡片展示
  - 待发送附件可删除
  - 服务端附件删除接口
- 图片能力
  - 图片上传为 data URL
  - OCR 文本提取
  - 视觉模型直传
  - 非视觉模型自动降级
- 知识库与检索
  - 文件导入
  - URL 导入
  - FTS 关键词检索
  - 本地轻量向量检索
  - hybrid + rerank
- 模型能力
  - 外部模型连接测试
  - 当前模型保存与导入导出
  - 连接历史
- 学习工作流
  - 诊断
  - 计划
  - 资源生成
  - 练习题
  - 反馈

## OCR 与图片识别说明

- OCR 服务位于 `1/server/src/services/imageOcrService.js`。
- 当前使用 `tesseract.js`，默认语言为 `chi_sim + eng`。
- Tesseract Core 从本地 `node_modules/tesseract.js-core` 读取。
- OCR 缓存默认在：

```text
1/data/ocr-cache
```

- 如设置 `AGENT_DATA_DIR`，OCR 缓存会跟随该目录。
- 如设置 `TESSERACT_LANG_PATH`，会优先从该路径读取训练数据。
- 如果首次 OCR 时本机缺少语言数据且无法联网下载，系统会静默降级，不会影响聊天、上传和其他功能。

## 数据与配置

SQLite 数据库默认位于：

```text
1/server/data/app.db
```

如设置 `AGENT_DATA_DIR`，数据库会改为：

```text
%AGENT_DATA_DIR%\app.db
```

运行时模型配置默认位于：

```text
%USERPROFILE%\Documents\agent API\runtime-config.json
```

如设置 `AGENT_CONFIG_DIR`，则改为：

```text
%AGENT_CONFIG_DIR%\runtime-config.json
```

## 当前验证状态

当前代码已完成并通过：

- `npm test`
- `npm run build`

## 文档索引

- 接口说明见 [API文档.md](./API文档.md)
- 维护与排障见 [维护文档.md](./维护文档.md)
- 架构与实现细节见 [详细技术说明文档.md](./详细技术说明文档.md)
