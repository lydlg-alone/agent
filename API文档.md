# AI 学习多智能体工作台 API 文档

## 1. 基础信息

- 项目目录：[`1`](./1)
- 本地服务默认地址：`http://127.0.0.1:3001`
- API 前缀：`/api`
- 数据格式：`application/json`

## 2. 通用返回约定

成功时返回 JSON 对象或数组。

错误时返回：

```json
{
  "code": "INTERNAL_ERROR",
  "message": "Server error"
}
```

部分业务错误会返回更具体的状态码，例如聊天会话不存在时返回 `404`。

## 3. 健康检查

### `GET /api/health`

说明：检查本地 API 服务是否正常。

响应示例：

```json
{
  "status": "ok",
  "timestamp": "2026-05-18T03:00:00.000Z"
}
```

## 4. 总览接口

### `GET /api/dashboard/summary`

说明：返回首页统计信息和工作流摘要。

响应示例：

```json
{
  "counts": {
    "models": 2,
    "knowledgeBases": 2,
    "agents": 4,
    "resources": 1
  },
  "workflow": [
    "诊断智能体分析当前水平",
    "规划智能体生成阶段路径",
    "资源智能体生成学习资料",
    "练习智能体生成题目与答案",
    "反馈智能体输出评分和优化建议"
  ],
  "charts": {
    "progressTrend": [52, 58, 65, 74, 81],
    "accuracyTrend": [60, 66, 71, 79, 86]
  }
}
```

## 5. 模型配置接口

### `GET /api/models`

说明：获取模型配置列表。

响应字段：

- `id`
- `name`
- `provider`
- `base_url`
- `api_key_masked`
- `model_id`
- `context_length`
- `temperature`
- `stream_enabled`
- `is_default`
- `created_at`

### `POST /api/models`

说明：新增模型配置。

请求示例：

```json
{
  "name": "自定义模型",
  "provider": "OpenAI-Compatible",
  "baseUrl": "https://api.example.com/v1",
  "apiKey": "sk-demo",
  "modelId": "custom-chat",
  "contextLength": 8192,
  "temperature": 0.7,
  "streamEnabled": true,
  "isDefault": false
}
```

### `POST /api/models/test`

说明：测试模型接口连通性。当前为示例返回，不请求真实第三方接口。

请求示例：

```json
{
  "provider": "DeepSeek",
  "modelId": "deepseek-chat"
}
```

响应示例：

```json
{
  "success": true,
  "provider": "DeepSeek",
  "modelId": "deepseek-chat",
  "latencyMs": 420,
  "checkedAt": "2026-05-18T03:00:00.000Z",
  "message": "示例实现未调用真实大模型接口，当前返回本地连通性模拟结果。"
}
```

## 6. 知识库接口

### `GET /api/knowledge-bases`

说明：获取知识库列表。

### `POST /api/knowledge-bases`

说明：新建知识库。

请求示例：

```json
{
  "name": "高等数学知识库",
  "category": "数学",
  "status": "active",
  "vectorStore": "SQLite + sqlite-vec",
  "description": "包含导数、积分、极限等资料。"
}
```

### `POST /api/knowledge-bases/:id/documents`

说明：为指定知识库登记文档。当前用于示例数据记录。

请求示例：

```json
{
  "title": "导数基础讲义",
  "sourceType": "markdown",
  "chunkCount": 24
}
```

### `POST /api/knowledge-bases/:id/retrieval-test`

说明：执行知识库检索测试。

请求示例：

```json
{
  "query": "什么是导数的几何意义",
  "topK": 3
}
```

## 7. 智能体接口

### `GET /api/agents`

说明：获取智能体列表。

说明补充：

- 初始化时会自动补齐聊天工作区所需的 `retrieval` 和 `planning` 角色
- 手工新增的智能体仍可通过该接口统一管理

### `POST /api/agents`

说明：新增智能体。

请求示例：

```json
{
  "name": "资源生成智能体",
  "role": "resource_generation",
  "modelBinding": "DeepSeek",
  "promptTemplate": "根据学习目标生成结构化学习讲义。",
  "knowledgeScope": "高等数学知识库、用户画像、学习计划"
}
```

## 8. 学习工作流接口

### `POST /api/workflows/diagnose`

说明：执行学情诊断。

### `POST /api/workflows/plan`

说明：生成学习计划，并写入 `learning_plans`。

### `POST /api/workflows/resources`

说明：生成学习资源，并写入 `generated_resources`。

### `POST /api/workflows/practice`

说明：生成练习题，并写入 `questions`。

### `POST /api/workflows/feedback`

说明：提交答案并生成自动评价，同时写入 `answers`。

说明补充：

- 当前以上工作流接口均为本地示例逻辑
- 已具备数据库写入和前后端联调用法
- 尚未接入真实大模型推理

## 9. 聊天工作区接口

该部分为当前版本新增接口，用于支撑首页“聊天 / 多智能体学习空间”。

### `GET /api/chat/workspace`

说明：获取聊天工作区总状态，包括当前模型、协同智能体、会话列表、活动会话详情。

响应示例：

```json
{
  "currentModel": {
    "id": "model_deepseek",
    "name": "DeepSeek 资源生成",
    "provider": "DeepSeek",
    "modelId": "deepseek-chat",
    "isDefault": true
  },
  "agentCatalog": [
    {
      "id": "agent_x1",
      "name": "检索智能体",
      "role": "retrieval",
      "modelBinding": "DeepSeek 资源生成",
      "knowledgeScope": "知识库、附件、向量检索结果"
    },
    {
      "id": "agent_x2",
      "name": "规划智能体",
      "role": "planning",
      "modelBinding": "DeepSeek 资源生成",
      "knowledgeScope": "用户目标、会话上下文、知识库摘要"
    }
  ],
  "sessions": [
    {
      "id": "chat_xxxxxxxx",
      "title": "新建对话",
      "status": "active",
      "updatedAt": "2026-05-18T03:00:00.000Z",
      "messageCount": 1,
      "lastMessagePreview": "你好，我已经接入当前工作区..."
    }
  ],
  "activeSessionId": "chat_xxxxxxxx",
  "activeSession": {
    "id": "chat_xxxxxxxx",
    "title": "新建对话",
    "status": "active",
    "modelConfigId": "model_deepseek",
    "attachments": [],
    "messages": []
  }
}
```

### `POST /api/chat/sessions`

说明：创建聊天会话，并自动插入一条欢迎消息。

请求示例：

```json
{
  "title": "导数学习计划"
}
```

### `GET /api/chat/sessions/:id`

说明：获取单个会话详情。

返回字段：

- `id`
- `title`
- `status`
- `modelConfigId`
- `createdAt`
- `updatedAt`
- `attachments`
- `messages`

### `POST /api/chat/attachments`

说明：登记附件到某个聊天会话。当前版本记录元数据和文本摘录，不做真实文件落盘。

请求示例：

```json
{
  "sessionId": "chat_xxxxxxxx",
  "name": "lecture-notes.md",
  "mimeType": "text/markdown",
  "sizeBytes": 4096,
  "contentText": "# 导数\n\n这是附件正文"
}
```

响应示例：

```json
{
  "id": "att_xxxxxxxx",
  "sessionId": "chat_xxxxxxxx",
  "name": "lecture-notes.md",
  "mimeType": "text/markdown",
  "sizeBytes": 4096,
  "contentExcerpt": "# 导数\n\n这是附件正文",
  "createdAt": "2026-05-18T03:00:00.000Z"
}
```

### `POST /api/chat/messages`

说明：发送消息并生成一条助手回复，返回本轮协同状态。

请求示例：

```json
{
  "sessionId": "chat_xxxxxxxx",
  "content": "基于我刚上传的资料，帮我做一个两周学习计划",
  "attachmentIds": ["att_xxxxxxxx"]
}
```

响应示例：

```json
{
  "sessionId": "chat_xxxxxxxx",
  "currentModel": {
    "id": "model_deepseek",
    "name": "DeepSeek 资源生成",
    "provider": "DeepSeek",
    "model_id": "deepseek-chat"
  },
  "userMessage": {
    "id": "msg_user_x",
    "role": "user",
    "content": "基于我刚上传的资料，帮我做一个两周学习计划",
    "attachments": [
      {
        "id": "att_xxxxxxxx",
        "name": "lecture-notes.md",
        "mimeType": "text/markdown",
        "sizeBytes": 4096
      }
    ]
  },
  "assistantMessage": {
    "id": "msg_ai_x",
    "role": "assistant",
    "content": "当前模型：DeepSeek 资源生成。\n你的目标我理解为：基于我刚上传的资料，帮我做一个两周学习计划\n...",
    "agentStatuses": [
      {
        "agentId": "agent_x1",
        "name": "检索智能体",
        "role": "retrieval",
        "state": "completed",
        "summary": "已定位 2 个候选知识库..."
      },
      {
        "agentId": "agent_x2",
        "name": "规划智能体",
        "role": "planning",
        "state": "completed",
        "summary": "已根据你的目标拆解回答结构..."
      }
    ]
  }
}
```

## 10. 当前 API 边界

当前 API 已覆盖：

- 桌面首页聊天工作区
- 会话与消息持久化
- 模型配置管理
- 知识库基础管理
- 智能体基础管理
- 学习资源生成
- 练习与反馈闭环

当前 API 尚未覆盖：

- 真实第三方模型调用
- 真实文件保存、解析与索引
- 真实向量检索和重排
- 用户登录鉴权
- 导出报告与附件下载
