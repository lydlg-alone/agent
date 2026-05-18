import axios from "axios";
import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";
import { getActiveAgent } from "./agentService.js";
import { getCurrentModelConfig } from "./modelConfigService.js";
import { getRuntimeCredentials } from "./runtimeConfigService.js";

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

function buildApiUrl(baseUrl, path) {
  return `${String(baseUrl || "").trim().replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;
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

function getCurrentRuntimeModelId() {
  const runtime = getRuntimeCredentials();
  return runtime.modelId || getCurrentModelConfig()?.modelId || "";
}

function hasRuntimeModelAccess() {
  const runtime = getRuntimeCredentials();
  return Boolean(runtime.baseUrl && runtime.apiKey && getCurrentRuntimeModelId());
}

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

  return getDb()
    .prepare(
      `SELECT id, name, role, model_binding, knowledge_scope, prompt_template
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
  const stats =
    getDb()
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
    hasRuntimeModelAccess()
      ? "已检测到真实模型接入，后续问题会优先通过外部 AI 接口回答。"
      : "当前未接入外部模型，将使用本地演示回复。"
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

function insertGreetingMessage(sessionId) {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO chat_messages (
        id, session_id, role, content, agent_statuses_json, attachments_json, created_at
      ) VALUES (
        @id, @session_id, @role, @content, @agent_statuses_json, @attachments_json, @created_at
      )`
    )
    .run({
      id: createId("msg"),
      session_id: sessionId,
      role: "assistant",
      content: createGreetingContent(),
      agent_statuses_json: JSON.stringify(buildIdleAgentStatuses()),
      attachments_json: JSON.stringify([]),
      created_at: now
    });
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
  return getDb()
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
  return getDb()
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
  return getDb()
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
  const session = getDb().prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionId);

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
  const now = new Date().toISOString();

  if (title) {
    getDb().prepare("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?").run(title, now, sessionId);
    return;
  }

  getDb().prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
}

function buildSessionTitle(content) {
  const normalized = String(content || "").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 18) : "新建对话";
}

function pickRelevantKnowledgeBases(content, attachments) {
  const knowledgeBases = getDb()
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

  return (matched.length ? matched : knowledgeBases).slice(0, 3);
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
      summary: `已根据你的目标拆解回答结构，准备围绕“${buildSessionTitle(content)}”生成回答。`
    };
  });
}

function serializeAttachmentRefs(attachments) {
  return attachments.map((item) => ({
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes
  }));
}

function extractAssistantContent(data) {
  const textContent = data?.choices?.[0]?.message?.content;
  if (typeof textContent === "string" && textContent.trim()) {
    return textContent.trim();
  }

  if (Array.isArray(textContent)) {
    const merged = textContent
      .map((item) => item?.text || item?.content || "")
      .filter(Boolean)
      .join("\n");
    if (merged.trim()) {
      return merged.trim();
    }
  }

  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  return "";
}

function normalizeHistoryMessages(messages) {
  return messages
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role,
      content: item.content
    }));
}

function buildModelMessages({ session, userContent, attachments, activeAgent, relatedKnowledgeBases, runtime }) {
  const systemBlocks = [];

  if (runtime.systemPrompt) {
    systemBlocks.push(runtime.systemPrompt);
  }

  if (activeAgent) {
    systemBlocks.push(`当前学习角色：${activeAgent.name}`);
    if (activeAgent.promptTemplate) {
      systemBlocks.push(`角色工作方式：${activeAgent.promptTemplate}`);
    }
    if (activeAgent.knowledgeScope) {
      systemBlocks.push(`角色知识范围：${activeAgent.knowledgeScope}`);
    }
  }

  if (relatedKnowledgeBases.length) {
    const kbSummary = relatedKnowledgeBases
      .map((item, index) => `${index + 1}. ${item.name}（${item.category}）`)
      .join("\n");
    systemBlocks.push(`优先参考以下知识库：\n${kbSummary}`);
  }

  if (attachments.length) {
    const attachmentSummary = attachments
      .map((item, index) => `${index + 1}. ${item.name}\n${item.contentExcerpt || "无可用摘录"}`)
      .join("\n\n");
    systemBlocks.push(`本轮附件摘录如下，请优先结合它们回答：\n${attachmentSummary}`);
  }

  systemBlocks.push("请使用简体中文回答，尽量直接、准确，并给出可执行建议。");

  const historyMessages = normalizeHistoryMessages(session.messages);
  const userBlocks = [userContent.trim()];
  if (attachments.length) {
    userBlocks.push(`本轮附件：${attachments.map((item) => item.name).join("、")}`);
  }

  return [
    {
      role: "system",
      content: systemBlocks.join("\n\n")
    },
    ...historyMessages,
    {
      role: "user",
      content: userBlocks.join("\n\n")
    }
  ];
}

function buildLocalAssistantReply({ content, attachments, sessionId }) {
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
    "当前还没有真实调用外部模型，因此这是一条本地演示回复。",
    "如果你已经在设置页填写了 API Base URL 和 API Key，请重新保存配置后再试。"
  ]
    .filter(Boolean)
    .join("\n");
}

async function requestModelReply({ session, userContent, attachments, activeAgent, relatedKnowledgeBases }) {
  const runtime = getRuntimeCredentials();
  const model = runtime.modelId || getCurrentModelConfig()?.modelId;

  if (!runtime.baseUrl || !runtime.apiKey || !model) {
    return null;
  }

  const response = await axios.post(
    buildApiUrl(runtime.baseUrl, "/chat/completions"),
    {
      model,
      messages: buildModelMessages({
        session,
        userContent,
        attachments,
        activeAgent,
        relatedKnowledgeBases,
        runtime
      }),
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 45000
    }
  );

  const content = extractAssistantContent(response.data);
  if (!content) {
    throw new Error("模型接口返回成功，但未提供可显示的文本内容。");
  }

  return {
    content,
    source: "api"
  };
}

function insertMessage(record) {
  getDb()
    .prepare(
      `INSERT INTO chat_messages (
        id, session_id, role, content, agent_statuses_json, attachments_json, created_at
      ) VALUES (
        @id, @session_id, @role, @content, @agent_statuses_json, @attachments_json, @created_at
      )`
    )
    .run(record);
}

export function createSession(payload = {}) {
  ensureWorkspaceAgents();

  const session = createChatSessionRecord(payload.title || "新建对话");
  getDb()
    .prepare(
      `INSERT INTO chat_sessions (
        id, title, model_config_id, status, created_at, updated_at
      ) VALUES (
        @id, @title, @model_config_id, @status, @created_at, @updated_at
      )`
    )
    .run(session);

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

  const record = {
    id: createId("att"),
    session_id: sessionId,
    name: payload.name,
    mime_type: payload.mimeType || "application/octet-stream",
    size_bytes: Number(payload.sizeBytes || 0),
    content_excerpt: String(payload.contentText || "").slice(0, 1600),
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

export async function sendMessage(payload) {
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
          `SELECT id, name, mime_type, size_bytes, content_excerpt
           FROM chat_attachments
           WHERE session_id = ? AND id IN (${attachmentIds.map(() => "?").join(",")})`
        )
        .all(sessionId, ...attachmentIds)
        .map((item) => ({
          id: item.id,
          name: item.name,
          mimeType: item.mime_type,
          sizeBytes: Number(item.size_bytes || 0),
          contentExcerpt: item.content_excerpt || ""
        }))
    : [];

  const userContent = String(payload.content || "").trim();
  const activeAgent = getActiveAgent();
  const relatedKnowledgeBases = pickRelevantKnowledgeBases(userContent, attachments);
  const agentStatuses = buildAgentStatuses({
    content: userContent,
    attachments
  });

  const userMessage = {
    id: createId("msg"),
    session_id: sessionId,
    role: "user",
    content: userContent,
    agent_statuses_json: JSON.stringify([]),
    attachments_json: JSON.stringify(serializeAttachmentRefs(attachments)),
    created_at: new Date().toISOString()
  };

  let assistantReply;
  try {
    assistantReply =
      (await requestModelReply({
        session,
        userContent,
        attachments,
        activeAgent,
        relatedKnowledgeBases
      })) || {
        content: buildLocalAssistantReply({
          content: userContent,
          attachments,
          sessionId
        }),
        source: "mock"
      };
  } catch (error) {
    const details =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      "未知错误";
    const wrapped = new Error(`调用外部模型失败：${details}`);
    wrapped.statusCode = error.response?.status || 500;
    throw wrapped;
  }

  const assistantMessage = {
    id: createId("msg"),
    session_id: sessionId,
    role: "assistant",
    content: assistantReply.content,
    agent_statuses_json: JSON.stringify(agentStatuses),
    attachments_json: JSON.stringify([]),
    created_at: new Date(Date.now() + 50).toISOString()
  };

  db.transaction(() => {
    insertMessage(userMessage);
    insertMessage(assistantMessage);
    const title = session.messages.some((item) => item.role === "user") ? null : buildSessionTitle(userContent);
    updateSessionActivity(sessionId, title);
  })();

  return {
    sessionId,
    currentModel: getCurrentModelConfig(),
    activeAgent,
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
      source: assistantReply.source,
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

  getDb().transaction(() => {
    getDb().prepare("DELETE FROM chat_messages WHERE session_id = ?").run(sessionId);
    getDb().prepare("DELETE FROM chat_attachments WHERE session_id = ?").run(sessionId);
    insertGreetingMessage(sessionId);
    updateSessionActivity(sessionId);
  })();

  return getSessionById(sessionId);
}
