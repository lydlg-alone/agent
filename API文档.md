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
  "timestamp": "2026-05-19T03:00:00.000Z"
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

说明：测试模型接口连通性。已接入外部 HTTP 调用，会实际请求配置的 API 地址。

### `POST /api/models/current/detect`

说明：根据 Base URL 和 API Key 自动检测识别当前模型 ID。

## 6. 知识库接口

### `GET /api/knowledge-bases`

说明：获取知识库列表。

### `POST /api/knowledge-bases`

说明：新建知识库。

### `POST /api/knowledge/import`

说明：导入本地文档到知识库。支持 PDF、DOCX、Markdown、TXT 等格式。PDF/DOCX 会上传到服务端自动解析为纯文本并切块索引到 FTS5。

请求示例：

```json
{
  "files": [
    {
      "name": "高等数学复习提纲.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 12340,
      "contentText": "data:application/pdf;base64,JVBERi0xLjQK..."
    }
  ]
}
```

### `DELETE /api/knowledge/documents/:id`

说明：删除指定知识文档，同时清理关联的 RAG 切块。

### `DELETE /api/knowledge/documents`

说明：清空所有知识文档，同时清理所有关联的 RAG 切块。

## 7. 智能体接口

### `GET /api/agents`

说明：获取智能体列表。初始化时会自动补齐聊天工作区所需的 `retrieval` 和 `planning` 角色。

### `POST /api/agents`

说明：新增智能体。

### `POST /api/agents/:id/activate`

说明：激活指定智能体为当前工作智能体。

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

## 9. 聊天工作区接口

该部分为当前版本核心接口，用于支撑首页聊天 / 多智能体学习空间。

### `GET /api/chat/workspace`

说明：获取聊天工作区总状态，包括当前模型、协同智能体、会话列表、活动会话详情。

响应示例：

```json
{
  "currentModel": {
    "id": "model_deepseek",
    "name": "DeepSeek 学习工作模型",
    "provider": "DeepSeek",
    "modelId": "deepseek-chat",
    "isDefault": true
  },
  "activeAgent": {
    "id": "agent_planner",
    "name": "学习规划智能体",
    "role": "planning"
  },
  "agentCatalog": [
    {
      "id": "agent_x1",
      "name": "检索智能体",
      "role": "retrieval",
      "modelBinding": "DeepSeek 学习工作模型",
      "knowledgeScope": "知识库、上传附件、文档切片"
    },
    {
      "id": "agent_x2",
      "name": "规划智能体",
      "role": "planning",
      "modelBinding": "DeepSeek 学习工作模型",
      "knowledgeScope": "学习目标、对话上下文、可用资源"
    }
  ],
  "sessions": [
    {
      "id": "chat_xxxxxxxx",
      "title": "导数学习计划",
      "status": "active",
      "updatedAt": "2026-05-19T03:00:00.000Z",
      "messageCount": 5,
      "lastMessagePreview": "好的，我理解你的学习目标是..."
    }
  ],
  "activeSessionId": "chat_xxxxxxxx",
  "activeSession": {
    "id": "chat_xxxxxxxx",
    "title": "导数学习计划",
    "status": "active",
    "modelConfigId": "model_deepseek",
    "attachments": [ { "id": "att_x", "name": "notes.pdf", "mimeType": "application/pdf" } ],
    "messages": [
      {
        "id": "msg_x",
        "role": "assistant",
        "content": "你好，我已经接入当前学习工作区...",
        "citations": [],
        "agentStatuses": [ { "agentId": "agent_x1", "name": "检索智能体", "state": "idle" } ],
        "createdAt": "2026-05-19T03:00:00.000Z"
      }
    ]
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

说明：获取单个会话详情（含消息列表、附件列表、引用信息）。

### `PATCH /api/chat/sessions/:id`

说明：重命名会话。

请求示例：

```json
{
  "title": "微积分专项复习"
}
```

### `DELETE /api/chat/sessions/:id`

说明：删除会话，同时清理关联消息、附件和 RAG 切块。返回新的活动会话。

### `POST /api/chat/sessions/:id/clear`

说明：清空会话的所有消息和附件（保留会话本身），同时清理关联的 RAG 切块。

### `POST /api/chat/attachments`

说明：上传附件到聊天会话。支持 PDF、DOCX、MD、TXT 等格式。PDF/DOCX 上传后自动在服务端解析为纯文本、切块、建立 FTS5 索引。

请求示例（Markdown 文件，直接发送文本内容）：

```json
{
  "sessionId": "chat_xxxxxxxx",
  "name": "lecture-notes.md",
  "mimeType": "text/markdown",
  "sizeBytes": 4096,
  "contentText": "# 导数\n\n这是附件正文"
}
```

请求示例（PDF 文件，以 Base64 Data URL 发送）：

```json
{
  "sessionId": "chat_xxxxxxxx",
  "name": "calculus.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 204800,
  "contentText": "data:application/pdf;base64,JVBERi0xLjQK..."
}
```

响应示例：

```json
{
  "id": "att_xxxxxxxx",
  "sessionId": "chat_xxxxxxxx",
  "name": "calculus.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 204800,
  "contentExcerpt": "第一章 极限与连续\n\n极限是微积分的基石概念...（解析后的文本前 2000 字符）",
  "createdAt": "2026-05-19T03:00:00.000Z"
}
```

### `POST /api/chat/messages`

说明：发送消息并生成一条助手回复。发送时自动执行 RAG 检索——根据消息内容搜索已索引的文档切块，将相关片段注入 LLM 上下文，返回引用信息。

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
    "name": "DeepSeek 学习工作模型",
    "provider": "DeepSeek",
    "modelId": "deepseek-chat"
  },
  "activeAgent": {
    "id": "agent_planner",
    "name": "学习规划智能体",
    "role": "planning"
  },
  "userMessage": {
    "id": "msg_user_x",
    "role": "user",
    "content": "基于我刚上传的资料，帮我做一个两周学习计划",
    "attachments": [
      {
        "id": "att_xxxxxxxx",
        "name": "calculus.pdf",
        "mimeType": "application/pdf",
        "sizeBytes": 204800
      }
    ],
    "createdAt": "2026-05-19T03:00:00.000Z"
  },
  "assistantMessage": {
    "id": "msg_ai_x",
    "role": "assistant",
    "content": "根据你上传的微积分资料，我为你制定了以下两周学习计划...",
    "citations": [
      {
        "refId": 1,
        "sourceName": "calculus.pdf",
        "chunkIndex": 3,
        "snippet": "极限定义与无穷小替换是高数第一阶段学习重点..."
      },
      {
        "refId": 2,
        "sourceName": "calculus.pdf",
        "chunkIndex": 7,
        "snippet": "函数连续性判断需要结合左右极限与函数值..."
      }
    ],
    "agentStatuses": [
      {
        "agentId": "agent_x1",
        "name": "检索智能体",
        "role": "retrieval",
        "state": "completed",
        "summary": "已定位 2 个候选知识库，覆盖 12 份资料。本轮未附带附件。"
      },
      {
        "agentId": "agent_x2",
        "name": "规划智能体",
        "role": "planning",
        "state": "completed",
        "summary": "已根据你的目标拆解回答结构..."
      }
    ],
    "source": "api",
    "createdAt": "2026-05-19T03:00:00.000Z"
  }
}
```

`citations` 字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `refId` | number | 引用编号，对应 LLM 提示中的 `[REF:N]` 标记 |
| `sourceName` | string | 来源文件名 |
| `chunkIndex` | number | 文档切块序号 |
| `snippet` | string | 切块内容前 120 字符预览 |

## 10. 当前 API 边界

当前 API 已覆盖：

- 桌面首页聊天工作区（含 RAG 检索增强）
- 会话与消息持久化（含会话重命名、删除、清空）
- 附件上传与文档解析（PDF / DOCX / MD / TXT）
- 文档自动切块与 FTS5 全文索引
- RAG 检索召回与引用返回
- 模型配置管理（含自动检测和连通性测试）
- 知识库管理与文档导入（含解析+切块+索引）
- 智能体市场与激活切换
- 学习资源生成、练习与反馈闭环

当前 API 尚未覆盖：

- 向量检索（当前为 FTS5 关键词检索）
- 用户登录鉴权
- 导出报告与附件下载
- 流式响应（SSE）
