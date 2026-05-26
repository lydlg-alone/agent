# API 文档

本文档对应当前本地后端实现，默认基础地址如下：

```text
http://127.0.0.1:3001/api
```

## 统一说明

- 所有请求和响应均为 `application/json`
- 流式聊天接口除外，返回 `text/event-stream`
- 失败时默认返回：

```json
{
  "message": "错误说明"
}
```

## 健康检查

### `GET /health`

用于检查服务是否可用。

响应示例：

```json
{
  "status": "ok"
}
```

## 仪表盘

### `GET /dashboard/summary`

获取首页摘要数据。

### `GET /analytics/overview`

获取学习数据统计总览（新增）。

响应示例：

```json
{
  "counts": {
    "sessions": 12,
    "messages": 156,
    "userMessages": 78,
    "assistantMessages": 78,
    "documents": 8,
    "knowledgeBases": 1,
    "agents": 4,
    "questions": 20,
    "answers": 15,
    "resources": 5,
    "plans": 3,
    "bookmarks": 7,
    "totalDocSizeBytes": 245760
  },
  "dailyActivity": [
    { "day": "2025-01-10", "total": 24, "user_count": 12, "assistant_count": 12 },
    { "day": "2025-01-11", "total": 18, "user_count": 9, "assistant_count": 9 }
  ],
  "scoreTrend": [
    { "day": "2025-01-10", "avg_score": 78.5, "count": 3 },
    { "day": "2025-01-11", "avg_score": 85.0, "count": 2 }
  ],
  "docTypeDistribution": [
    { "type": "pdf", "count": 3, "total_size": 120000 },
    { "type": "markdown", "count": 5, "total_size": 125760 }
  ],
  "recentDocuments": [
    {
      "id": "kdoc_xxx",
      "name": "高等数学复习提纲.pdf",
      "sourceType": "pdf",
      "sizeBytes": 45000,
      "createdAt": "2025-01-11T08:00:00.000Z"
    }
  ],
  "recentSessions": [
    {
      "id": "chat_xxx",
      "title": "JavaScript 异步复习",
      "updatedAt": "2025-01-11T10:00:00.000Z",
      "messageCount": 24
    }
  ],
  "practiceSummary": {
    "totalQuestions": 20,
    "totalAnswers": 15,
    "avgScore": 82.3
  }
}
```

## 模型与运行时配置

### `GET /models`

读取当前可用模型列表。

### `GET /models/current`

读取当前运行时配置、当前模型和最近成功模型。

响应示例：

```json
{
  "settings": {
    "provider": "deepseek",
    "baseUrl": "https://api.deepseek.com/v1",
    "modelId": "deepseek-v4-flash",
    "systemPrompt": "你是学习助理。",
    "hasApiKey": true,
    "configPath": "C:\\Users\\用户名\\Documents\\agent API\\runtime-config.json"
  },
  "currentModel": {
    "name": "deepseek-v4-flash",
    "provider": "deepseek",
    "baseUrl": "https://api.deepseek.com/v1",
    "modelId": "deepseek-v4-flash",
    "streamEnabled": true
  },
  "recentSuccessfulModels": []
}
```

### `GET /models/current/stream`

运行时配置订阅接口，使用 `EventSource` 持续接收配置更新。

### `POST /models/current`

保存当前运行时配置。

请求体示例：

```json
{
  "provider": "deepseek",
  "baseUrl": "https://api.deepseek.com/v1",
  "apiKey": "sk-***",
  "modelId": "deepseek-v4-flash",
  "systemPrompt": "你是学习助理。"
}
```

### `POST /models/current/detect`

根据当前配置探测模型列表或当前模型信息。

### `POST /models/test`

测试模型连接。

### `GET /models/templates`

获取供应商配置模板列表。

### `GET /models/history`

获取历史连接测试记录。

### `DELETE /models/history`

清空连接历史。

### `GET /models/recent-successful`

获取最近成功连接的模型记录。

### `POST /models/export`

导出当前配置，不返回明文密钥。

### `POST /models/import`

导入模型配置。

## 智能体

### `GET /agents`

获取全部智能体列表。

### `GET /agents/active`

获取当前激活智能体。

### `POST /agents`

创建智能体。

请求体示例：

```json
{
  "name": "代码学习助理",
  "role": "coding-coach",
  "modelBinding": "deepseek-v4-flash",
  "promptTemplate": "请优先解释代码思路。",
  "knowledgeScope": "编程、调试、复习"
}
```

### `POST /agents/:id/activate`

激活指定智能体。

## 知识库

### `GET /knowledge-bases`

获取知识库列表。

### `POST /knowledge-bases`

创建知识库。

### `POST /knowledge-bases/:id/documents`

向指定知识库添加单条文档元信息。

### `POST /knowledge-bases/:id/retrieval-test`

测试指定知识库的检索效果。

请求体示例：

```json
{
  "query": "请总结 JavaScript 异步编程的核心概念",
  "topK": 3
}
```

### `GET /knowledge/documents`

获取知识库文档列表，支持搜索。

查询参数：

- `search`：关键字搜索

### `POST /knowledge/import`

批量导入文档。

请求体示例：

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

### `DELETE /knowledge/documents/:id`

删除单条知识文档。

### `DELETE /knowledge/documents`

清空全部知识文档。

## 聊天工作区

### `GET /chat/workspace`

获取聊天工作区聚合数据。通常包含：

- 历史会话列表
- 当前会话消息
- 当前智能体
- 当前模型
- 知识库状态

### `POST /chat/sessions`

创建新会话。

请求体示例：

```json
{
  "title": "给我一份复习计划"
}
```

### `GET /chat/sessions/:id`

获取单个会话详情。

### `PATCH /chat/sessions/:id`

重命名会话。

请求体示例：

```json
{
  "title": "JavaScript 异步复习"
}
```

### `DELETE /chat/sessions/:id`

删除指定会话。

### `POST /chat/sessions/:id/clear`

清空指定会话的消息内容。

### `POST /chat/attachments`

上传聊天附件。后端会尝试解析文本，并为后续检索准备内容。

请求体示例：

```json
{
  "sessionId": "session_xxx",
  "name": "高等数学复习提纲.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 52342,
  "contentText": ""
}
```

### `POST /chat/messages`

发送普通聊天消息，等待完整回答后一次性返回。

请求体示例：

```json
{
  "sessionId": "session_xxx",
  "content": "基于知识库生成今天的复习计划",
  "attachmentIds": []
}
```

响应示例：

```json
{
  "session": {
    "id": "session_xxx",
    "title": "给我一份复习计划"
  },
  "userMessage": {
    "role": "user",
    "content": "基于知识库生成今天的复习计划"
  },
  "assistantMessage": {
    "role": "assistant",
    "content": "下面是一份可执行的复习计划。",
    "source": "api",
    "citations": [
      {
        "sourceId": "doc_xxx",
        "sourceName": "高等数学复习提纲.md",
        "chunkIndex": 0
      }
    ]
  }
}
```

> 注意：`assistantMessage.content` 可能包含 Markdown 格式文本（GFM 表格、代码块、LaTeX 公式等），前端通过 `marked` + `highlight.js` + `KaTeX` 渲染。

### `POST /chat/messages/stream`

发送流式聊天消息，返回 `SSE` 事件流。

请求体与普通聊天接口一致。

事件类型：

- `start`：开始生成
- `delta`：分片增量
- `done`：完成
- `error`：失败

事件示例：

```text
data: {"type":"start","sessionId":"session_xxx","assistantMessageId":"msg_xxx"}

data: {"type":"delta","delta":"先明确今天的复习范围。"}

data: {"type":"delta","delta":"然后拆成 3 个阶段。"}

data: {"type":"done","message":{"role":"assistant","content":"..."}}
```

> 注意：`delta` 事件中的内容为纯文本片段，前端在流式完成后整体渲染 Markdown。

## 学习工作流

### `POST /workflows/diagnose`

诊断学习状态。

请求体示例：

```json
{
  "goal": "掌握 JavaScript 异步编程",
  "level": "中级"
}
```

### `POST /workflows/plan`

生成学习计划。

请求体示例：

```json
{
  "goal": "掌握 JavaScript 异步编程",
  "difficulty": "中等"
}
```

### `POST /workflows/resources`

生成学习资料。

请求体示例：

```json
{
  "topic": "Promise 与 async/await",
  "goal": "掌握 JavaScript 异步编程",
  "resourceType": "讲义",
  "difficulty": "中等",
  "knowledgeBaseId": "kb_xxx"
}
```

### `POST /workflows/practice`

生成练习内容。

请求体示例：

```json
{
  "topic": "Promise 链式调用",
  "questionType": "简答题",
  "difficulty": "中等",
  "knowledgeBaseId": "kb_xxx"
}
```

### `POST /workflows/feedback`

评估答案并返回反馈。

请求体示例：

```json
{
  "questionId": "q_xxx",
  "answerText": "Promise 是一种异步编程解决方案..."
}
```

响应示例：

```json
{
  "id": "ans_xxx",
  "question_id": "q_xxx",
  "answer_text": "Promise 是一种异步编程解决方案...",
  "score": 88,
  "feedback": "结构完整，建议补充更具体的案例。",
  "mistakeSummary": [],
  "nextStep": "进入综合测试阶段"
}
```

## 备注

- 当前检索能力基于 SQLite `FTS5` 文本召回
- 当前配置文件位于系统"文档"目录下的 `agent API/runtime-config.json`
- `API Key` 不再明文返回或导出
- 聊天消息支持 Markdown/LaTeX 格式，前端负责渲染
- 仪表盘接口从 SQLite 实时聚合统计，无数据时返回空数组/零值
- 学习工作流接口支持 LLM 调用（需配置有效运行时）和 Mock 降级两种模式
