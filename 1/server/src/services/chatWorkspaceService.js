import axios from "axios";
import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";
import { getActiveAgent } from "./agentService.js";
import { getCurrentModelConfig } from "./modelConfigService.js";
import { getRuntimeCredentials } from "./runtimeConfigService.js";
import { chunkText } from "./chunkingService.js";
import { parseDocumentFromUpload } from "./documentParserService.js";
import { buildCitationPrompt, indexChunks, removeChunks, searchChunks } from "./ragService.js";

const REQUIRED_AGENT_DEFINITIONS = [
  {
    role: "retrieval",
    name: "检索智能体",
    knowledgeScope: "知识库、上传附件、文档切片",
    promptTemplate: "从知识库与上传资料中提取与当前问题最相关的事实和片段。"
  },
  {
    role: "planning",
    name: "学习规划智能体",
    knowledgeScope: "学习目标、对话上下文、可用资源",
    promptTemplate: "围绕用户目标拆解任务，规划清晰的回答结构和执行步骤。"
  }
];

function buildApiUrl(baseUrl, targetPath) {
  return `${String(baseUrl || "").trim().replace(/\/+$/, "")}/${String(targetPath || "").replace(/^\/+/, "")}`;
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

function maskRuntimeAccess() {
  const runtime = getRuntimeCredentials();
  const modelId = runtime.modelId || getCurrentModelConfig()?.modelId || "";
  return {
    runtime,
    available: Boolean(runtime.baseUrl && runtime.apiKey && modelId),
    modelId
  };
}

function ensureWorkspaceAgents() {
  const db = getDb();
  const existingRoles = new Set(db.prepare("SELECT role FROM agents").all().map((item) => item.role));
  const fallbackModelName = getCurrentModelConfig()?.name || "Default Model";
  const insert = db.prepare(
    `INSERT INTO agents (
      id, name, role, model_binding, prompt_template, knowledge_scope, created_at
    ) VALUES (
      @id, @name, @role, @model_binding, @prompt_template, @knowledge_scope, @created_at
    )`
  );

  for (const definition of REQUIRED_AGENT_DEFINITIONS) {
    if (existingRoles.has(definition.role)) {
      continue;
    }

    insert.run({
      id: createId("agent"),
      name: definition.name,
      role: definition.role,
      model_binding: fallbackModelName,
      prompt_template: definition.promptTemplate,
      knowledge_scope: definition.knowledgeScope,
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
    .all()
    .map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      modelBinding: item.model_binding,
      knowledgeScope: item.knowledge_scope,
      promptTemplate: item.prompt_template
    }));
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
  const activeAgent = getActiveAgent();
  const agents = getWorkspaceAgents();
  const knowledgeSummary = getKnowledgeSummary();
  const runtimeAccess = maskRuntimeAccess().available;

  return [
    `你好，我已经接入当前学习工作区，正在使用模型：${model?.name || "未配置模型"}。`,
    activeAgent ? `当前激活的学习智能体：${activeAgent.name}。` : "当前还没有激活学习智能体。",
    `协同状态智能体：${agents.map((item) => item.name).join("、") || "暂无"}。`,
    `当前已连接 ${knowledgeSummary.knowledgeBaseCount} 个知识库，共 ${knowledgeSummary.documentCount} 份资料。`,
    runtimeAccess ? "已检测到真实模型接入，后续问题会优先通过外部 AI 接口回答。" : "当前未接入外部模型，将使用本地演示回复。"
  ].join("\n");
}

function createChatSessionRecord(title = "新建对话") {
  const now = new Date().toISOString();

  return {
    id: createId("chat"),
    title,
    modelConfigId: getCurrentModelConfig()?.id || null,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

function insertGreetingMessage(sessionId) {
  insertMessage({
    id: createId("msg"),
    sessionId,
    role: "assistant",
    content: createGreetingContent(),
    agentStatuses: buildIdleAgentStatuses(),
    attachments: [],
    citations: [],
    createdAt: new Date().toISOString()
  });
}

function createInitialSession() {
  const session = createChatSessionRecord();
  getDb()
    .prepare(
      `INSERT INTO chat_sessions (
        id, title, model_config_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(session.id, session.title, session.modelConfigId, session.status, session.createdAt, session.updatedAt);
  insertGreetingMessage(session.id);
  return session;
}

function ensureActiveSession() {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT *
       FROM chat_sessions
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`
    )
    .get();

  return existing || createInitialSession();
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
      lastMessagePreview: String(item.last_message || "").slice(0, 60)
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
      `SELECT id, role, content, agent_statuses_json, attachments_json, citations_json, created_at
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
      citations: parseJsonField(item.citations_json, []),
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

function serializeAttachmentRefs(attachments) {
  return attachments.map((item) => ({
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes
  }));
}

function pickRelevantKnowledgeBases(content, attachments) {
  const keywordSource = `${content} ${attachments.map((item) => item.name).join(" ")}`.toLowerCase();
  const knowledgeBases = getDb()
    .prepare(
      `SELECT id, name, category, description, document_count
       FROM knowledge_bases
       ORDER BY document_count DESC, created_at ASC`
    )
    .all();

  if (!keywordSource) {
    return knowledgeBases.slice(0, 3);
  }

  const matched = knowledgeBases.filter((item) => {
    const haystack = `${item.name} ${item.category} ${item.description || ""}`.toLowerCase();
    return haystack.includes(keywordSource.slice(0, 6));
  });

  return (matched.length ? matched : knowledgeBases).slice(0, 3);
}

function buildAgentStatuses({ content, attachments, relatedKnowledgeBases }) {
  const knowledgeSummary = getKnowledgeSummary();
  const attachmentSummary = attachments.length
    ? `已读取附件：${attachments.map((item) => item.name).join("、")}。`
    : "本轮未附带附件。";

  return getWorkspaceAgents().map((agent) => {
    if (agent.role === "retrieval") {
      return {
        agentId: agent.id,
        name: agent.name,
        role: agent.role,
        state: "completed",
        summary: `已定位 ${relatedKnowledgeBases.length} 个候选知识库，覆盖 ${knowledgeSummary.documentCount} 份资料。${attachmentSummary}`
      };
    }

    return {
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      state: "completed",
      summary: `已根据当前问题生成回答结构，准备围绕“${buildSessionTitle(content)}”组织回复。`
    };
  });
}

function normalizeHistoryMessages(messages) {
  return messages
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role,
      content: item.content
    }));
}

function buildModelMessages({ session, userContent, attachments, activeAgent, relatedKnowledgeBases, runtime, ragContext }) {
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
    systemBlocks.push(
      `优先参考以下知识库：\n${relatedKnowledgeBases
        .map((item, index) => `${index + 1}. ${item.name}（${item.category}）`)
        .join("\n")}`
    );
  }

  if (attachments.length) {
    systemBlocks.push(
      `本轮附件摘录如下，请优先结合它们回答：\n${attachments
        .map((item, index) => `${index + 1}. ${item.name}\n${item.contentExcerpt || "无可用摘录"}`)
        .join("\n\n")}`
    );
  }

  if (ragContext.promptText) {
    systemBlocks.push(ragContext.promptText);
  }

  systemBlocks.push("请使用简体中文回答，尽量直接、准确，并给出可执行建议。");

  const userBlocks = [String(userContent || "").trim()];
  if (attachments.length) {
    userBlocks.push(`本轮附件：${attachments.map((item) => item.name).join("、")}`);
  }

  return [
    { role: "system", content: systemBlocks.join("\n\n") },
    ...normalizeHistoryMessages(session.messages),
    { role: "user", content: userBlocks.join("\n\n") }
  ];
}

function buildLocalAssistantReply({ content, attachments, sessionId, relatedKnowledgeBases }) {
  const currentModel = getCurrentModelConfig();
  const activeAgent = getActiveAgent();
  const recentMessages = getSessionMessages(sessionId).slice(-4);

  const attachmentLine = attachments.length
    ? `已纳入附件：${attachments.map((item) => item.name).join("、")}。`
    : "本轮没有上传新的附件。";
  const knowledgeLine = relatedKnowledgeBases.length
    ? `我优先参考了 ${relatedKnowledgeBases.map((item) => item.name).join("、")}。`
    : "当前没有可用知识库，我将只基于你的文字任务组织回答。";
  const continuityLine =
    recentMessages.length > 1
      ? `我也保留了最近 ${recentMessages.length - 1} 条上下文，避免回答脱离当前会话。`
      : "这是当前会话的首轮任务，你可以继续追问我来逐步细化。";

  return [
    `当前模型：${currentModel?.name || "未配置模型"}。`,
    activeAgent ? `当前学习角色：${activeAgent.name}，侧重点是 ${activeAgent.knowledgeScope}。` : "",
    `你的目标我理解为：${String(content || "").trim()}`,
    attachmentLine,
    knowledgeLine,
    continuityLine,
    "当前还没有真实调用外部模型，因此这是一条本地演示回复。",
    "如果你已经在设置页填写了 API Base URL 和 API Key，请重新保存配置后再试。"
  ]
    .filter(Boolean)
    .join("\n");
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

function extractStreamDelta(payload) {
  return (
    payload?.choices?.[0]?.delta?.content ||
    payload?.choices?.[0]?.message?.content ||
    payload?.choices?.[0]?.text ||
    ""
  );
}

async function requestModelReply({ session, userContent, attachments, activeAgent, relatedKnowledgeBases, ragContext }) {
  const { runtime, available, modelId } = maskRuntimeAccess();
  if (!available) {
    return null;
  }

  const response = await axios.post(
    buildApiUrl(runtime.baseUrl, "/chat/completions"),
    {
      model: modelId,
      messages: buildModelMessages({
        session,
        userContent,
        attachments,
        activeAgent,
        relatedKnowledgeBases,
        runtime,
        ragContext
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

async function requestModelReplyStream(
  { session, userContent, attachments, activeAgent, relatedKnowledgeBases, ragContext },
  onDelta
) {
  const { runtime, available, modelId } = maskRuntimeAccess();
  if (!available) {
    return null;
  }

  const response = await axios.post(
    buildApiUrl(runtime.baseUrl, "/chat/completions"),
    {
      model: modelId,
      stream: true,
      messages: buildModelMessages({
        session,
        userContent,
        attachments,
        activeAgent,
        relatedKnowledgeBases,
        runtime,
        ragContext
      }),
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`,
        "Content-Type": "application/json"
      },
      responseType: "stream",
      timeout: 60000
    }
  );

  return await new Promise((resolve, reject) => {
    let buffer = "";
    let accumulated = "";
    let settled = false;

    const finalize = () => {
      if (settled) {
        return;
      }

      settled = true;
      if (!accumulated.trim()) {
        reject(new Error("模型流式接口返回成功，但没有产出可显示的文本内容。"));
        return;
      }

      resolve({
        content: accumulated,
        source: "api"
      });
    };

    const handlePacket = (packet) => {
      if (!packet) {
        return;
      }

      if (packet === "[DONE]") {
        finalize();
        return;
      }

      try {
        const payload = JSON.parse(packet);
        const delta = extractStreamDelta(payload);
        if (!delta) {
          return;
        }

        accumulated += delta;
        onDelta?.(delta, accumulated, payload);
      } catch {
        // Ignore partial or malformed packets from upstream providers.
      }
    };

    response.data.setEncoding("utf8");
    response.data.on("data", (chunk) => {
      buffer += chunk;
      const packets = buffer.split(/\r?\n\r?\n/);
      buffer = packets.pop() || "";

      for (const packet of packets) {
        const data = packet
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");

        handlePacket(data);
      }
    });

    response.data.on("end", () => {
      if (buffer.trim()) {
        const data = buffer
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        handlePacket(data);
      }

      finalize();
    });

    response.data.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    });
  });
}

async function streamTextByChunks(text, onDelta) {
  const chunks = String(text || "").match(/[\s\S]{1,18}/g) || [];
  let accumulated = "";

  for (const chunk of chunks) {
    accumulated += chunk;
    onDelta?.(chunk, accumulated);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return accumulated;
}

function insertMessage(record) {
  getDb()
    .prepare(
      `INSERT INTO chat_messages (
        id, session_id, role, content, agent_statuses_json, attachments_json, citations_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.sessionId,
      record.role,
      record.content,
      JSON.stringify(record.agentStatuses || []),
      JSON.stringify(record.attachments || []),
      JSON.stringify(record.citations || []),
      record.createdAt
    );
}

async function maybeIndexAttachment(record, payloadContentText) {
  const source = String(payloadContentText || "").trim();
  if (!source) {
    return record.contentExcerpt;
  }

  try {
    const fullText = await parseDocumentFromUpload(record.name, record.mimeType, source);
    const excerpt = String(fullText || "").slice(0, 2000);
    if (excerpt) {
      getDb().prepare("UPDATE chat_attachments SET content_excerpt = ? WHERE id = ?").run(excerpt, record.id);
      const chunks = chunkText(fullText);
      if (chunks.length) {
        indexChunks("chat_attachment", record.id, record.name, chunks);
      }
      return excerpt;
    }
  } catch (error) {
    console.error(`Failed to parse document "${record.name}":`, error.message);
  }

  return record.contentExcerpt;
}

async function buildMessageContext(payload) {
  ensureWorkspaceAgents();

  const db = getDb();
  const sessionId = payload.sessionId || ensureActiveSession().id;
  const session = getSessionById(sessionId);

  if (!session) {
    const error = new Error("聊天会话不存在。");
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

  let ragContext = { promptText: "", citationMeta: [] };
  try {
    const retrievedChunks = searchChunks(userContent, { topK: 5 });
    if (retrievedChunks.length) {
      ragContext = buildCitationPrompt(retrievedChunks);
    }
  } catch (error) {
    console.error("RAG search failed:", error.message);
  }

  const agentStatuses = buildAgentStatuses({
    content: userContent,
    attachments,
    relatedKnowledgeBases
  });

  return {
    db,
    sessionId,
    session,
    attachments,
    userContent,
    activeAgent,
    relatedKnowledgeBases,
    ragContext,
    agentStatuses,
    userMessage: {
      id: createId("msg"),
      sessionId,
      role: "user",
      content: userContent,
      agentStatuses: [],
      attachments: serializeAttachmentRefs(attachments),
      citations: [],
      createdAt: new Date().toISOString()
    }
  };
}

function persistMessageExchange(context, assistantReply) {
  const assistantMessage = {
    id: createId("msg"),
    sessionId: context.sessionId,
    role: "assistant",
    content: assistantReply.content,
    agentStatuses: context.agentStatuses,
    attachments: [],
    citations: context.ragContext.citationMeta,
    createdAt: new Date(Date.now() + 50).toISOString()
  };

  context.db.transaction(() => {
    insertMessage(context.userMessage);
    insertMessage(assistantMessage);
    const title = context.session.messages.some((item) => item.role === "user")
      ? null
      : buildSessionTitle(context.userContent);
    updateSessionActivity(context.sessionId, title);
  })();

  return {
    sessionId: context.sessionId,
    currentModel: getCurrentModelConfig(),
    activeAgent: context.activeAgent,
    userMessage: {
      id: context.userMessage.id,
      role: context.userMessage.role,
      content: context.userMessage.content,
      attachments: context.userMessage.attachments,
      createdAt: context.userMessage.createdAt
    },
    assistantMessage: {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      citations: assistantMessage.citations,
      agentStatuses: assistantMessage.agentStatuses,
      attachments: [],
      source: assistantReply.source,
      createdAt: assistantMessage.createdAt
    }
  };
}

export function createSession(payload = {}) {
  ensureWorkspaceAgents();

  const session = createChatSessionRecord(String(payload.title || "").trim() || "新建对话");
  getDb()
    .prepare(
      `INSERT INTO chat_sessions (
        id, title, model_config_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(session.id, session.title, session.modelConfigId, session.status, session.createdAt, session.updatedAt);
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
    agentCatalog: getWorkspaceAgents(),
    sessions: listSessions(),
    activeSessionId: activeSession.id,
    activeSession: getSessionById(activeSession.id)
  };
}

export function getSessionDetail(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) {
    const error = new Error("聊天会话不存在。");
    error.statusCode = 404;
    throw error;
  }

  return session;
}

export function renameSession(sessionId, title) {
  const session = getSessionById(sessionId);
  if (!session) {
    const error = new Error("聊天会话不存在。");
    error.statusCode = 404;
    throw error;
  }

  const nextTitle = String(title || "").trim() || "新建对话";
  getDb().prepare("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?").run(nextTitle, new Date().toISOString(), sessionId);
  return getSessionById(sessionId);
}

export function deleteSession(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) {
    const error = new Error("聊天会话不存在。");
    error.statusCode = 404;
    throw error;
  }

  const db = getDb();
  db.transaction(() => {
    const attachmentIds = db
      .prepare("SELECT id FROM chat_attachments WHERE session_id = ?")
      .all(sessionId)
      .map((item) => item.id);

    for (const attachmentId of attachmentIds) {
      removeChunks("chat_attachment", attachmentId);
    }

    db.prepare("DELETE FROM chat_messages WHERE session_id = ?").run(sessionId);
    db.prepare("DELETE FROM chat_attachments WHERE session_id = ?").run(sessionId);
    db.prepare("DELETE FROM chat_sessions WHERE id = ?").run(sessionId);
  })();

  const nextSession =
    db
      .prepare(
        `SELECT *
         FROM chat_sessions
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1`
      )
      .get() || createInitialSession();

  return {
    deletedSessionId: sessionId,
    activeSessionId: nextSession.id,
    activeSession: getSessionById(nextSession.id),
    sessions: listSessions()
  };
}

export async function uploadAttachment(payload) {
  ensureWorkspaceAgents();

  const sessionId = payload.sessionId || ensureActiveSession().id;
  const session = getSessionById(sessionId);
  if (!session) {
    const error = new Error("聊天会话不存在。");
    error.statusCode = 404;
    throw error;
  }

  const record = {
    id: createId("att"),
    sessionId,
    name: payload.name,
    mimeType: payload.mimeType || "application/octet-stream",
    sizeBytes: Number(payload.sizeBytes || 0),
    contentExcerpt: String(payload.contentText || "").slice(0, 1600),
    createdAt: new Date().toISOString()
  };

  getDb()
    .prepare(
      `INSERT INTO chat_attachments (
        id, session_id, name, mime_type, size_bytes, content_excerpt, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(record.id, record.sessionId, record.name, record.mimeType, record.sizeBytes, record.contentExcerpt, record.createdAt);

  record.contentExcerpt = await maybeIndexAttachment(record, payload.contentText);
  updateSessionActivity(sessionId);

  return {
    id: record.id,
    sessionId: record.sessionId,
    name: record.name,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    contentExcerpt: record.contentExcerpt,
    createdAt: record.createdAt
  };
}

export async function sendMessage(payload) {
  const context = await buildMessageContext(payload);

  let assistantReply;
  try {
    assistantReply =
      (await requestModelReply({
        session: context.session,
        userContent: context.userContent,
        attachments: context.attachments,
        activeAgent: context.activeAgent,
        relatedKnowledgeBases: context.relatedKnowledgeBases,
        ragContext: context.ragContext
      })) || {
        content: buildLocalAssistantReply({
          content: context.userContent,
          attachments: context.attachments,
          sessionId: context.sessionId,
          relatedKnowledgeBases: context.relatedKnowledgeBases
        }),
        source: "mock"
      };
  } catch (error) {
    const details = error.response?.data?.error?.message || error.response?.data?.message || error.message || "未知错误";
    const wrapped = new Error(`调用外部模型失败：${details}`);
    wrapped.statusCode = error.response?.status || 500;
    throw wrapped;
  }

  return persistMessageExchange(context, assistantReply);
}

export async function streamMessage(payload, callbacks = {}) {
  const context = await buildMessageContext(payload);
  const provisionalAssistantMessage = {
    id: createId("msg"),
    role: "assistant",
    content: "",
    citations: [],
    agentStatuses: context.agentStatuses,
    attachments: [],
    source: maskRuntimeAccess().available ? "api" : "mock",
    createdAt: new Date(Date.now() + 50).toISOString()
  };

  callbacks.onStart?.({
    sessionId: context.sessionId,
    currentModel: getCurrentModelConfig(),
    activeAgent: context.activeAgent,
    userMessage: {
      id: context.userMessage.id,
      role: context.userMessage.role,
      content: context.userMessage.content,
      attachments: context.userMessage.attachments,
      createdAt: context.userMessage.createdAt
    },
    assistantMessage: provisionalAssistantMessage
  });

  let assistantReply;
  try {
    assistantReply =
      (await requestModelReplyStream(
        {
          session: context.session,
          userContent: context.userContent,
          attachments: context.attachments,
          activeAgent: context.activeAgent,
          relatedKnowledgeBases: context.relatedKnowledgeBases,
          ragContext: context.ragContext
        },
        (delta, content) => {
          callbacks.onDelta?.({
            delta,
            content,
            sessionId: context.sessionId,
            assistantMessageId: provisionalAssistantMessage.id
          });
        }
      )) || {
        content: await streamTextByChunks(
          buildLocalAssistantReply({
            content: context.userContent,
            attachments: context.attachments,
            sessionId: context.sessionId,
            relatedKnowledgeBases: context.relatedKnowledgeBases
          }),
          (delta, content) => {
            callbacks.onDelta?.({
              delta,
              content,
              sessionId: context.sessionId,
              assistantMessageId: provisionalAssistantMessage.id
            });
          }
        ),
        source: "mock"
      };
  } catch (error) {
    const details = error.response?.data?.error?.message || error.response?.data?.message || error.message || "未知错误";
    const wrapped = new Error(`调用外部模型失败：${details}`);
    wrapped.statusCode = error.response?.status || 500;
    throw wrapped;
  }

  const result = persistMessageExchange(context, assistantReply);
  callbacks.onDone?.(result);
  return result;
}

export function clearSessionMessages(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) {
    const error = new Error("聊天会话不存在。");
    error.statusCode = 404;
    throw error;
  }

  getDb().transaction(() => {
    const attachmentIds = getDb()
      .prepare("SELECT id FROM chat_attachments WHERE session_id = ?")
      .all(sessionId)
      .map((item) => item.id);

    for (const attachmentId of attachmentIds) {
      removeChunks("chat_attachment", attachmentId);
    }

    getDb().prepare("DELETE FROM chat_messages WHERE session_id = ?").run(sessionId);
    getDb().prepare("DELETE FROM chat_attachments WHERE session_id = ?").run(sessionId);
    insertGreetingMessage(sessionId);
    updateSessionActivity(sessionId);
  })();

  return getSessionById(sessionId);
}
