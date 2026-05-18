import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";
import { getActiveAgent } from "./agentService.js";
import { getCurrentModelConfig } from "./modelConfigService.js";

const REQUIRED_AGENT_DEFINITIONS = [
  {
    role: "retrieval",
    name: "检索智能体",
    knowledge_scope: "知识库、上传附件、文档切片",
    prompt_template: "从知识库与上传资料中提取与当前指令最相关的事实和片段。"
  },
  {
    role: "planning",
    name: "规划智能体",
    knowledge_scope: "学习目标、对话上下文、可用资源",
    prompt_template: "围绕用户意图拆解任务，规划清晰的回答结构和执行步骤。"
  }
];

function ensureWorkspaceAgents() {
  const db = getDb();
  const roles = new Set(db.prepare("SELECT role FROM agents").all().map((item) => item.role));
  const fallbackModel = getCurrentModelConfig();

  const insert = db.prepare(
    `INSERT INTO agents (
      id, name, role, model_binding, prompt_template, knowledge_scope, created_at
    ) VALUES (
      @id, @name, @role, @model_binding, @prompt_template, @knowledge_scope, @created_at
    )`
  );

  for (const definition of REQUIRED_AGENT_DEFINITIONS) {
    if (roles.has(definition.role)) {
      continue;
    }

    insert.run({
      id: createId("agent"),
      name: definition.name,
      role: definition.role,
      model_binding: fallbackModel?.name || "Default Model",
      prompt_template: definition.prompt_template,
      knowledge_scope: definition.knowledge_scope,
      created_at: new Date().toISOString()
    });
  }
}

function getWorkspaceAgents() {
  ensureWorkspaceAgents();

  const db = getDb();
  return db
    .prepare(
      `SELECT id, name, role, model_binding, knowledge_scope
       FROM agents
       WHERE role IN ('retrieval', 'planning')
       ORDER BY CASE role
         WHEN 'retrieval' THEN 1
         WHEN 'planning' THEN 2
         ELSE 99
       END, created_at ASC`
    )
    .all();
}

function getKnowledgeSummary() {
  const db = getDb();
  const stats =
    db
      .prepare(
        `SELECT
          COUNT(*) AS knowledge_base_count,
          COALESCE(SUM(document_count), 0) AS document_count
         FROM knowledge_bases`
      )
      .get() || {};

  return {
    knowledgeBaseCount: Number(stats.knowledge_base_count || 0),
    documentCount: Number(stats.document_count || 0)
  };
}

function createGreetingContent() {
  const model = getCurrentModelConfig();
  const agents = getWorkspaceAgents();
  const activeAgent = getActiveAgent();
  const knowledgeSummary = getKnowledgeSummary();

  return [
    `你好，我已经接入当前学习工作区，正在使用模型：${model?.name || "未配置模型"}。`,
    activeAgent ? `当前激活的学习智能体：${activeAgent.name}。` : "当前还没有激活学习智能体。",
    `协同状态智能体：${agents.map((item) => item.name).join("、") || "暂无"}。`,
    `当前已连接 ${knowledgeSummary.knowledgeBaseCount} 个知识库，共 ${knowledgeSummary.documentCount} 份资料。`,
    "你可以直接输入学习任务，或先上传资料让我基于知识库给出计划、总结和讲解。"
  ].join("\n");
}

function createChatSessionRecord(title = "新建对话") {
  const now = new Date().toISOString();
  const model = getCurrentModelConfig();

  return {
    id: createId("chat"),
    title,
    model_config_id: model?.id || null,
    status: "active",
    created_at: now,
    updated_at: now
  };
}

function parseJsonField(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildIdleAgentStatuses() {
  return getWorkspaceAgents().map((agent) => ({
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    state: "idle",
    summary:
      agent.role === "retrieval"
        ? "等待检索指令，尚未开始分析知识库或附件。"
        : "等待任务拆解，尚未生成回答策略。"
  }));
}

function insertGreetingMessage(sessionId) {
  const db = getDb();
  const now = new Date().toISOString();
  const message = {
    id: createId("msg"),
    session_id: sessionId,
    role: "assistant",
    content: createGreetingContent(),
    agent_statuses_json: JSON.stringify(buildIdleAgentStatuses()),
    attachments_json: JSON.stringify([]),
    created_at: now
  };

  db.prepare(
    `INSERT INTO chat_messages (
      id, session_id, role, content, agent_statuses_json, attachments_json, created_at
    ) VALUES (
      @id, @session_id, @role, @content, @agent_statuses_json, @attachments_json, @created_at
    )`
  ).run(message);
}

function ensureActiveSession() {
  const db = getDb();
  let session = db
    .prepare(
      `SELECT *
       FROM chat_sessions
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`
    )
    .get();

  if (session) {
    return session;
  }

  session = createChatSessionRecord();
  db.prepare(
    `INSERT INTO chat_sessions (
      id, title, model_config_id, status, created_at, updated_at
    ) VALUES (
      @id, @title, @model_config_id, @status, @created_at, @updated_at
    )`
  ).run(session);

  insertGreetingMessage(session.id);
  return session;
}

function listSessions() {
  const db = getDb();

  return db
    .prepare(
      `SELECT
        s.id,
        s.title,
        s.status,
        s.updated_at,
        COUNT(m.id) AS message_count,
        (
          SELECT content
          FROM chat_messages latest
          WHERE latest.session_id = s.id
          ORDER BY latest.created_at DESC
          LIMIT 1
        ) AS last_message
       FROM chat_sessions s
       LEFT JOIN chat_messages m ON m.session_id = s.id
       GROUP BY s.id, s.title, s.status, s.updated_at
       ORDER BY s.updated_at DESC, s.created_at DESC`
    )
    .all()
    .map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      updatedAt: item.updated_at,
      messageCount: Number(item.message_count || 0),
      lastMessagePreview: item.last_message?.slice(0, 60) || ""
    }));
}

function getAttachmentsBySession(sessionId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, name, mime_type, size_bytes, content_excerpt, created_at
       FROM chat_attachments
       WHERE session_id = ?
       ORDER BY created_at ASC`
    )
    .all(sessionId)
    .map((item) => ({
      id: item.id,
      name: item.name,
      mimeType: item.mime_type,
      sizeBytes: Number(item.size_bytes || 0),
      contentExcerpt: item.content_excerpt || "",
      createdAt: item.created_at
    }));
}

function getSessionMessages(sessionId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, role, content, agent_statuses_json, attachments_json, created_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`
    )
    .all(sessionId)
    .map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      agentStatuses: parseJsonField(item.agent_statuses_json, []),
      attachments: parseJsonField(item.attachments_json, []),
      createdAt: item.created_at
    }));
}

function getSessionById(sessionId) {
  const db = getDb();
  const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionId);

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    title: session.title,
    status: session.status,
    modelConfigId: session.model_config_id,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    attachments: getAttachmentsBySession(sessionId),
    messages: getSessionMessages(sessionId)
  };
}

function updateSessionActivity(sessionId, title) {
  const db = getDb();
  const now = new Date().toISOString();

  if (title) {
    db.prepare("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?").run(title, now, sessionId);
    return;
  }

  db.prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
}

function buildSessionTitle(content) {
  const normalized = (content || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "新建对话";
  }

  return normalized.slice(0, 18);
}

function pickRelevantKnowledgeBases(content, attachments) {
  const db = getDb();
  const knowledgeBases = db
    .prepare(
      `SELECT id, name, category, description, document_count
       FROM knowledge_bases
       ORDER BY document_count DESC, created_at ASC`
    )
    .all();

  const keywords = `${content} ${attachments.map((item) => item.name).join(" ")}`.toLowerCase();
  const matched = knowledgeBases.filter((item) => {
    const haystack = `${item.name} ${item.category} ${item.description || ""}`.toLowerCase();
    return keywords && haystack.includes(keywords.slice(0, 6));
  });

  return (matched.length > 0 ? matched : knowledgeBases).slice(0, 3);
}

function buildAgentStatuses({ content, attachments }) {
  const agents = getWorkspaceAgents();
  const knowledgeBases = pickRelevantKnowledgeBases(content, attachments);
  const knowledgeSummary = getKnowledgeSummary();
  const attachmentSummary = attachments.length
    ? `已读取附件：${attachments.map((item) => item.name).join("、")}。`
    : "本轮未附带附件。";

  return agents.map((agent) => {
    if (agent.role === "retrieval") {
      return {
        agentId: agent.id,
        name: agent.name,
        role: agent.role,
        state: "completed",
        summary: `已定位 ${knowledgeBases.length} 个候选知识库，覆盖 ${knowledgeSummary.documentCount} 份资料。${attachmentSummary}`
      };
    }

    return {
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      state: "completed",
      summary: `已根据你的目标拆解回答结构，准备围绕“${buildSessionTitle(content)}”给出执行建议。`
    };
  });
}

function buildAssistantReply({ content, attachments, sessionId }) {
  const model = getCurrentModelConfig();
  const activeAgent = getActiveAgent();
  const relatedKnowledgeBases = pickRelevantKnowledgeBases(content, attachments);
  const recentMessages = getSessionMessages(sessionId).slice(-4);
  const latestUserGoal = content.trim();
  const attachmentLine = attachments.length
    ? `已纳入附件：${attachments.map((item) => item.name).join("、")}。`
    : "本轮没有上传新的附件。";
  const knowledgeLine = relatedKnowledgeBases.length
    ? `我优先参考了 ${relatedKnowledgeBases.map((item) => item.name).join("、")}。`
    : "当前没有可用知识库，我将只基于你的文字任务组织回答。";
  const continuityLine =
    recentMessages.length > 1
      ? `我也保留了最近 ${recentMessages.length - 1} 条上下文，避免回答脱离当前会话。`
      : "这是当前会话的首轮任务，可以继续追问我来逐步细化。";

  return [
    `当前模型：${model?.name || "未配置模型"}。`,
    activeAgent ? `当前学习角色：${activeAgent.name}，侧重点是 ${activeAgent.knowledgeScope}。` : "",
    `你的目标我理解为：${latestUserGoal}`,
    attachmentLine,
    knowledgeLine,
    continuityLine,
    "建议下一步：",
    "1. 如果你需要学习计划，我可以继续拆成阶段目标和每日动作。",
    "2. 如果你需要直接讲解，我可以围绕当前主题输出结构化讲义。",
    "3. 如果你想基于附件追问，可以继续指定要分析的章节、题目或段落。"
  ]
    .filter(Boolean)
    .join("\n");
}

function insertMessage(record) {
  const db = getDb();
  db.prepare(
    `INSERT INTO chat_messages (
      id, session_id, role, content, agent_statuses_json, attachments_json, created_at
    ) VALUES (
      @id, @session_id, @role, @content, @agent_statuses_json, @attachments_json, @created_at
    )`
  ).run(record);
}

function serializeAttachmentRefs(attachments) {
  return attachments.map((item) => ({
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes
  }));
}

export function createSession(payload = {}) {
  ensureWorkspaceAgents();

  const db = getDb();
  const session = createChatSessionRecord(payload.title || "新建对话");
  db.prepare(
    `INSERT INTO chat_sessions (
      id, title, model_config_id, status, created_at, updated_at
    ) VALUES (
      @id, @title, @model_config_id, @status, @created_at, @updated_at
    )`
  ).run(session);

  insertGreetingMessage(session.id);
  return getSessionById(session.id);
}

export function getWorkspaceState() {
  const activeSession = ensureActiveSession();
  const model = getCurrentModelConfig();

  return {
    currentModel: model
      ? {
          id: model.id,
          name: model.name,
          provider: model.provider,
          modelId: model.modelId,
          isDefault: Boolean(model.isDefault)
        }
      : null,
    activeAgent: getActiveAgent(),
    agentCatalog: getWorkspaceAgents().map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      modelBinding: agent.model_binding,
      knowledgeScope: agent.knowledge_scope
    })),
    sessions: listSessions(),
    activeSessionId: activeSession.id,
    activeSession: getSessionById(activeSession.id)
  };
}

export function getSessionDetail(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) {
    const error = new Error("Chat session not found");
    error.statusCode = 404;
    throw error;
  }

  return session;
}

export function uploadAttachment(payload) {
  ensureWorkspaceAgents();

  const sessionId = payload.sessionId || ensureActiveSession().id;
  const session = getSessionById(sessionId);

  if (!session) {
    const error = new Error("Chat session not found");
    error.statusCode = 404;
    throw error;
  }

  const contentExcerpt = String(payload.contentText || "").slice(0, 1600);
  const record = {
    id: createId("att"),
    session_id: sessionId,
    name: payload.name,
    mime_type: payload.mimeType || "application/octet-stream",
    size_bytes: Number(payload.sizeBytes || 0),
    content_excerpt: contentExcerpt,
    created_at: new Date().toISOString()
  };

  getDb()
    .prepare(
      `INSERT INTO chat_attachments (
        id, session_id, name, mime_type, size_bytes, content_excerpt, created_at
      ) VALUES (
        @id, @session_id, @name, @mime_type, @size_bytes, @content_excerpt, @created_at
      )`
    )
    .run(record);

  updateSessionActivity(sessionId);

  return {
    id: record.id,
    sessionId,
    name: record.name,
    mimeType: record.mime_type,
    sizeBytes: record.size_bytes,
    contentExcerpt: record.content_excerpt,
    createdAt: record.created_at
  };
}

export function sendMessage(payload) {
  ensureWorkspaceAgents();

  const db = getDb();
  const sessionId = payload.sessionId || ensureActiveSession().id;
  const session = getSessionById(sessionId);

  if (!session) {
    const error = new Error("Chat session not found");
    error.statusCode = 404;
    throw error;
  }

  const attachmentIds = Array.isArray(payload.attachmentIds) ? payload.attachmentIds : [];
  const attachments = attachmentIds.length
    ? db
        .prepare(
          `SELECT id, name, mime_type, size_bytes
           FROM chat_attachments
           WHERE session_id = ? AND id IN (${attachmentIds.map(() => "?").join(",")})`
        )
        .all(sessionId, ...attachmentIds)
        .map((item) => ({
          id: item.id,
          name: item.name,
          mimeType: item.mime_type,
          sizeBytes: Number(item.size_bytes || 0)
        }))
    : [];

  const now = new Date().toISOString();
  const userMessage = {
    id: createId("msg"),
    session_id: sessionId,
    role: "user",
    content: payload.content,
    agent_statuses_json: JSON.stringify([]),
    attachments_json: JSON.stringify(serializeAttachmentRefs(attachments)),
    created_at: now
  };

  const agentStatuses = buildAgentStatuses({
    content: payload.content,
    attachments
  });
  const assistantMessage = {
    id: createId("msg"),
    session_id: sessionId,
    role: "assistant",
    content: buildAssistantReply({
      content: payload.content,
      attachments,
      sessionId
    }),
    agent_statuses_json: JSON.stringify(agentStatuses),
    attachments_json: JSON.stringify([]),
    created_at: new Date(Date.now() + 50).toISOString()
  };

  const transaction = db.transaction(() => {
    insertMessage(userMessage);
    insertMessage(assistantMessage);
    const title = session.messages.some((item) => item.role === "user") ? null : buildSessionTitle(payload.content);
    updateSessionActivity(sessionId, title);
  });

  transaction();

  return {
    sessionId,
    currentModel: getCurrentModelConfig(),
    activeAgent: getActiveAgent(),
    userMessage: {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      attachments: serializeAttachmentRefs(attachments),
      createdAt: userMessage.created_at
    },
    assistantMessage: {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      agentStatuses,
      attachments: [],
      createdAt: assistantMessage.created_at
    }
  };
}

export function clearSessionMessages(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) {
    const error = new Error("Chat session not found");
    error.statusCode = 404;
    throw error;
  }

  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM chat_messages WHERE session_id = ?").run(sessionId);
    db.prepare("DELETE FROM chat_attachments WHERE session_id = ?").run(sessionId);
    insertGreetingMessage(sessionId);
    updateSessionActivity(sessionId);
  });

  transaction();
  return getSessionById(sessionId);
}
