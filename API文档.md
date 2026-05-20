# API 文档

后端默认地址：

```text
http://127.0.0.1:3001/api
```

## 通用约定

- 普通接口使用 `application/json`
- 流式聊天接口使用 `text/event-stream`
- 失败时统一返回：

```json
{
  "code": "INTERNAL_ERROR",
  "message": "Server error"
}
```

- 健康检查入口：

```text
GET /api/health
```

## 1. 聊天工作区

### `GET /chat/workspace`

获取聊天工作区初始化数据，包括当前会话、会话列表、模型、知识库和当前激活智能体。

### `POST /chat/sessions`

创建会话。

请求体：

```json
{
  "title": "新的学习会话"
}
```

### `GET /chat/sessions/:id`

获取单个会话详情。

### `PATCH /chat/sessions/:id`

重命名会话。

### `DELETE /chat/sessions/:id`

删除会话。

### `POST /chat/sessions/:id/clear`

清空某个会话的消息。

### `POST /chat/attachments`

上传聊天附件。

请求体：

```json
{
  "sessionId": "session_xxx",
  "name": "diagram.png",
  "mimeType": "image/png",
  "sizeBytes": 20480,
  "contentText": "data:image/png;base64,..."
}
```

说明：

- 文本类附件使用 `contentText`
- 图片类附件也通过 `contentText` 传入 data URL
- 返回结果中会包含 `isImage`

### `POST /chat/messages`

发送非流式消息。

请求体：

```json
{
  "sessionId": "session_xxx",
  "content": "根据我的知识库总结这篇资料",
  "attachmentIds": ["att_xxx"],
  "useTools": true,
  "useWebSearch": false,
  "useStructuredOutput": false,
  "useHybridRetrieval": true,
  "useImageVision": true
}
```

字段说明：

- `useTools`
  - 允许模型调用本地工具
  - 当前可调用 `search_knowledge`
- `useWebSearch`
  - 启用联网搜索
  - 开启时后端会自动把 `useTools` 视为开启
  - 当前可调用 `web_search`
- `useStructuredOutput`
  - 要求模型按 JSON 对象返回
- `useHybridRetrieval`
  - 开启时使用 `hybrid` 检索
  - 关闭时使用 `keyword` 检索
- `useImageVision`
  - 上传图片时，是否作为视觉输入发送给模型

### `POST /chat/messages/stream`

发送流式消息，入参与 `/chat/messages` 一致。

SSE 事件类型：

- `start`
- `delta`
- `done`
- `error`

示例：

```text
data: {"type":"start","sessionId":"session_xxx","assistantMessageId":"msg_xxx"}

data: {"type":"delta","delta":"这是第一段内容"}

data: {"type":"done","assistantMessage":{"id":"msg_xxx","role":"assistant","content":"完整回答"}}
```

注意：

- 当开启 `useTools` 或 `useStructuredOutput` 时，后端会先完成工具调用或结构化整合，再输出结果

## 2. 知识库

### `GET /knowledge-bases`

获取知识库列表。

### `POST /knowledge-bases`

创建知识库。

请求体：

```json
{
  "name": "前端知识库",
  "category": "学习资料",
  "status": "draft",
  "vectorStore": "SQLite + sqlite-vec",
  "description": "用于存放前端学习材料"
}
```

### `GET /knowledge/documents`

获取知识文档列表。

查询参数：

- `search`：可选，按名称过滤

### `POST /knowledge/import`

导入文件到知识库。

请求体：

```json
{
  "files": [
    {
      "name": "JavaScript 异步编程笔记.md",
      "mimeType": "text/markdown",
      "sizeBytes": 8192,
      "contentText": "# Promise\n..."
    }
  ]
}
```

### `POST /knowledge/import-url`

新增。导入网页正文到知识库。

请求体：

```json
{
  "url": "https://example.com/article",
  "title": "可选的手动标题"
}
```

说明：

- 后端会抓取网页并提取正文文本
- 结果会切片并进入检索索引

### `DELETE /knowledge/documents/:id`

删除单个文档。

### `DELETE /knowledge/documents`

清空所有知识文档。

### `POST /knowledge-bases/:id/documents`

向指定知识库手动添加文档元信息。

### `POST /knowledge-bases/:id/retrieval-test`

测试检索结果。

请求体：

```json
{
  "query": "JavaScript Promise 的核心概念",
  "mode": "hybrid",
  "rerank": true,
  "topK": 3
}
```

参数说明：

- `mode` 可选值：`keyword`、`vector`、`hybrid`
- `rerank` 控制是否执行重排

## 3. 模型与运行时配置

### `GET /models`

获取模型配置列表。

### `GET /models/current`

获取当前运行时配置、当前模型和最近成功连接记录。

### `GET /models/current/stream`

SSE 方式订阅运行时配置变化。

### `POST /models`

新增模型配置模板。

### `POST /models/current`

保存当前运行时配置。

请求体：

```json
{
  "provider": "deepseek",
  "baseUrl": "https://api.deepseek.com/v1",
  "apiKey": "sk-***",
  "modelId": "deepseek-v4-flash",
  "systemPrompt": "请使用简体中文回答。"
}
```

### `POST /models/current/detect`

检测当前模型配置是否可用，并尝试识别可连接模型。

### `POST /models/test`

测试模型连接。

### `GET /models/templates`

获取预置供应商模板。

### `GET /models/history`

获取模型连接历史。

### `DELETE /models/history`

清空模型连接历史。

### `GET /models/recent-successful`

获取最近成功连接过的模型。

### `POST /models/export`

导出当前运行时配置。

### `POST /models/import`

导入运行时配置。

## 4. 智能体

### `GET /agents`

获取智能体列表。

### `GET /agents/active`

获取当前激活智能体。

### `POST /agents`

创建智能体。

请求体：

```json
{
  "name": "默认学习助手",
  "role": "study-assistant",
  "modelBinding": "deepseek-v4-flash",
  "promptTemplate": "你是一个耐心的学习助手。",
  "knowledgeScope": "本地知识库、当前目标、最近会话"
}
```

### `POST /agents/:id/activate`

激活指定智能体。

## 5. 学习工作流

### `POST /workflows/diagnose`

学习目标诊断。

### `POST /workflows/plan`

生成学习计划。

### `POST /workflows/resources`

生成学习资源。

### `POST /workflows/practice`

生成练习题。

### `POST /workflows/feedback`

批改答案并给出反馈。

## 6. 统计与概览

### `GET /dashboard/summary`

获取首页摘要信息。

### `GET /analytics/overview`

获取统计页概览，包括消息量、文档量、会话量、练习情况等。

## 7. 本次接口变更摘要

相对旧版本，当前接口新增或变化如下：

- `/chat/messages` 与 `/chat/messages/stream`
  - 新增五个能力开关字段
- `/knowledge/import-url`
  - 新增网页 URL 导入
- `/knowledge-bases/:id/retrieval-test`
  - 新增 `mode` 与 `rerank`
- `/chat/attachments`
  - 图片附件支持以 data URL 形式传入并标记为视觉附件
