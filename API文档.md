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

## 学习工作流

### `POST /workflows/diagnose`

诊断学习状态。

### `POST /workflows/plan`

生成学习计划。

### `POST /workflows/resources`

生成学习资料。

### `POST /workflows/practice`

生成练习内容。

### `POST /workflows/feedback`

评估答案并返回反馈。

## 备注

- 当前检索能力基于 SQLite `FTS5` 文本召回
- 当前配置文件位于系统“文档”目录下的 `agent API/runtime-config.json`
- `API Key` 不再明文返回或导出
