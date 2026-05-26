# API 文档

后端默认地址：

```text
http://127.0.0.1:3001/api
```

## 通用约定

- 普通接口使用 `application/json`
- 流式聊天与模型配置流使用 `text/event-stream`
- 失败时统一返回：

```json
{
  "code": "INTERNAL_ERROR",
  "message": "错误说明"
}
```

- 健康检查：

```text
GET /api/health
```

## 1. 聊天工作区

### `GET /chat/workspace`

获取聊天工作区初始化数据，包括：

- 当前模型
- 当前激活智能体
- 智能体目录
- 会话列表
- 当前会话详情

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

请求体：

```json
{
  "title": "新的会话名称"
}
```

### `DELETE /chat/sessions/:id`

删除会话。

### `POST /chat/sessions/:id/clear`

清空指定会话消息。

## 2. 聊天附件

### `POST /chat/attachments`

上传聊天附件。

请求体：

```json
{
  "sessionId": "chat_xxx",
  "name": "diagram.png",
  "mimeType": "image/png",
  "sizeBytes": 20480,
  "contentText": "data:image/png;base64,..."
}
```

说明：

- 文本类附件通过 `contentText` 传递内容。
- 图片类附件也通过 `contentText` 传递 data URL。
- 返回值中会包含 `isImage`。
- 图片附件上传后，后端会尝试 OCR，成功时把识别文字写入 `contentExcerpt`。
- OCR 失败不会导致上传失败。

返回示例：

```json
{
  "id": "att_xxx",
  "sessionId": "chat_xxx",
  "name": "diagram.png",
  "mimeType": "image/png",
  "sizeBytes": 20480,
  "contentExcerpt": "图片附件：diagram.png\nOCR识别文本：\n示例文字",
  "isImage": true,
  "createdAt": "2026-05-26T10:00:00.000Z"
}
```

### `DELETE /chat/attachments/:id`

删除待发送附件。

说明：

- 仅删除当前会话附件记录与附件检索索引。
- 适用于输入框中“文件卡片右上角删除”场景。

## 3. 聊天消息

### `POST /chat/messages`

发送普通消息。

请求体：

```json
{
  "sessionId": "chat_xxx",
  "content": "结合附件总结重点",
  "attachmentIds": ["att_xxx"],
  "useTools": true,
  "useWebSearch": false,
  "useStructuredOutput": false,
  "useHybridRetrieval": true,
  "useImageVision": true
}
```

字段说明：

- `content`
  - 消息正文
  - 与 `attachmentIds` 不能同时为空
- `attachmentIds`
  - 本轮消息关联的附件 ID 列表
- `useTools`
  - 是否允许工具调用
- `useWebSearch`
  - 是否启用网页搜索
- `useStructuredOutput`
  - 是否要求结构化输出
- `useHybridRetrieval`
  - 是否使用混合检索
- `useImageVision`
  - 是否允许图片走视觉输入链路

服务端规则：

- `useWebSearch=true` 时，服务端会自动视为启用了工具调用。
- 当前前端默认会传：
  - `useTools=true`
  - `useHybridRetrieval=true`
  - `useImageVision=true`
- 当前前端默认可切换：
  - `useWebSearch`
  - `useStructuredOutput`

图片相关行为：

- 若当前模型支持视觉输入，会发送 `image_url` 多模态消息。
- 若当前模型不支持视觉输入，服务端会自动降级为纯文本上下文。
- 若上游接口仍返回 `unknown variant 'image_url'` 一类错误，服务端会再次剥离视觉内容并自动重试。

### `POST /chat/messages/stream`

发送流式消息，入参与 `/chat/messages` 相同。

SSE 事件类型：

- `start`
- `delta`
- `done`
- `error`

示例：

```text
data: {"type":"start","sessionId":"chat_xxx","assistantMessageId":"msg_xxx"}

data: {"type":"delta","delta":"这是第一段"}

data: {"type":"done","assistantMessage":{"id":"msg_xxx","role":"assistant","content":"完整回复"}}
```

说明：

- 当开启 `useTools` 或 `useStructuredOutput` 时，后端会先完成整合再以流式分块输出最终文本。

## 4. 知识库

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
  "description": "用于存放前端学习资料"
}
```

### `GET /knowledge/documents`

获取知识库文档列表。

查询参数：

- `search`
  - 可选
  - 按名称过滤

### `POST /knowledge/import`

导入本地文件内容。

请求体：

```json
{
  "files": [
    {
      "name": "JavaScript 异步笔记.md",
      "mimeType": "text/markdown",
      "sizeBytes": 8192,
      "contentText": "# Promise\n..."
    }
  ]
}
```

### `POST /knowledge/import-url`

导入网页正文。

请求体：

```json
{
  "url": "https://example.com/article",
  "title": "可选标题"
}
```

### `DELETE /knowledge/documents/:id`

删除单个文档。

### `DELETE /knowledge/documents`

删除全部文档。

### `POST /knowledge-bases/:id/documents`

向指定知识库手动添加文档元信息。

### `POST /knowledge-bases/:id/retrieval-test`

测试检索结果。

请求体：

```json
{
  "query": "Promise 核心概念",
  "mode": "hybrid",
  "rerank": true,
  "topK": 3
}
```

参数说明：

- `mode` 可选值：`keyword`、`vector`、`hybrid`
- `rerank` 是否开启重排

## 5. 模型与运行时配置

### `GET /models`

获取模型配置列表。

### `GET /models/current`

获取当前运行时配置、当前模型和最近连接信息。

### `GET /models/current/stream`

SSE 订阅当前运行时配置变化。

### `POST /models`

新增模型配置模板。

### `POST /models/current`

保存当前运行时配置。

请求体：

```json
{
  "provider": "DeepSeek",
  "baseUrl": "https://api.deepseek.com/v1",
  "apiKey": "sk-***",
  "modelId": "deepseek-v4-flash",
  "systemPrompt": "请使用简体中文回答。"
}
```

### `POST /models/current/detect`

检测当前配置可用性，并尝试识别远端模型。

### `POST /models/test`

测试模型连接。

### `GET /models/templates`

获取预置供应商模板。

### `GET /models/history`

获取连接历史。

### `DELETE /models/history`

清空连接历史。

### `GET /models/recent-successful`

获取最近连接成功的模型。

### `POST /models/export`

导出当前配置。

### `POST /models/import`

导入配置。

## 6. 智能体

### `GET /agents`

获取智能体列表。

### `GET /agents/active`

获取当前激活智能体。

### `POST /agents`

创建智能体。

### `POST /agents/:id/activate`

激活指定智能体。

## 7. 学习工作流

### `POST /workflows/diagnose`

学习目标诊断。

### `POST /workflows/plan`

生成学习计划。

### `POST /workflows/resources`

生成学习资源。

### `POST /workflows/practice`

生成练习题。

### `POST /workflows/feedback`

批改答案并生成反馈。

## 8. 概览与统计

### `GET /dashboard/summary`

获取首页摘要信息。

### `GET /analytics/overview`

获取统计概览，包括会话、消息、文档、练习等信息。

## 9. 本轮接口更新摘要

当前文档对应版本新增或已同步的重点包括：

- 新增 `DELETE /chat/attachments/:id`
- 明确图片附件 OCR 处理逻辑
- 明确视觉模型与非视觉模型的自动兼容策略
- 明确前端默认自动开启 `useTools`、`useHybridRetrieval`、`useImageVision`
- 同步会话重命名接口 `PATCH /chat/sessions/:id`
