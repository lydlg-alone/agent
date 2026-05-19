import { getDb } from "../config/database.js";
import {
  seedAgents,
  seedKnowledgeBases,
  seedKnowledgeDocuments,
  seedModels
} from "../data/seedData.js";
import { createId } from "../utils/id.js";

function insertIfEmpty(tableName, rows, statementFactory) {
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get().total;
  if (total > 0) {
    return;
  }

  const insert = db.prepare(statementFactory());
  const transaction = db.transaction((items) => {
    for (const item of items) {
      insert.run(item);
    }
  });

  transaction(rows);
}

function ensureWorkspaceAgents() {
  const db = getDb();
  const existingRoles = new Set(db.prepare("SELECT role FROM agents").all().map((item) => item.role));
  const fallbackModel =
    db.prepare("SELECT name FROM model_configs ORDER BY is_default DESC, created_at DESC LIMIT 1").get()?.name ||
    "Default Model";

  const requiredAgents = [
    {
      name: "检索智能体",
      role: "retrieval",
      model_binding: fallbackModel,
      prompt_template: "从知识库和上传资料中检索与当前任务最相关的内容。",
      knowledge_scope: "知识库、附件、向量检索结果"
    },
    {
      name: "规划智能体",
      role: "planning",
      model_binding: fallbackModel,
      prompt_template: "根据用户目标和检索结果规划回答结构与下一步动作。",
      knowledge_scope: "用户目标、会话上下文、知识库摘要"
    }
  ];

  const insert = db.prepare(
    `INSERT INTO agents (
      id, name, role, model_binding, prompt_template, knowledge_scope, created_at
    ) VALUES (
      @id, @name, @role, @model_binding, @prompt_template, @knowledge_scope, @created_at
    )`
  );

  for (const agent of requiredAgents) {
    if (existingRoles.has(agent.role)) {
      continue;
    }

    insert.run({
      ...agent,
      id: createId("agent"),
      created_at: new Date().toISOString()
    });
  }
}

function syncSeedKnowledgeCounts() {
  const db = getDb();
  const bases = db.prepare("SELECT id FROM knowledge_bases").all();
  const countStmt = db.prepare("SELECT COUNT(*) AS total FROM knowledge_documents WHERE knowledge_base_id = ?");
  const updateStmt = db.prepare("UPDATE knowledge_bases SET document_count = ? WHERE id = ?");

  for (const base of bases) {
    const total = countStmt.get(base.id)?.total || 0;
    updateStmt.run(Number(total), base.id);
  }
}

export function seedInitialData() {
  insertIfEmpty(
    "model_configs",
    seedModels,
    () => `
      INSERT INTO model_configs (
        id, name, provider, base_url, api_key_masked, model_id,
        context_length, temperature, stream_enabled, is_default, created_at
      ) VALUES (
        @id, @name, @provider, @baseUrl, @apiKeyMasked, @modelId,
        @contextLength, @temperature, @streamEnabled, @isDefault, @createdAt
      )
    `
  );

  insertIfEmpty(
    "knowledge_bases",
    seedKnowledgeBases,
    () => `
      INSERT INTO knowledge_bases (
        id, name, category, status, vector_store, description, document_count, created_at
      ) VALUES (
        @id, @name, @category, @status, @vectorStore, @description, @documentCount, @createdAt
      )
    `
  );

  insertIfEmpty(
    "knowledge_documents",
    seedKnowledgeDocuments,
    () => `
      INSERT INTO knowledge_documents (
        id, knowledge_base_id, name, source_type, mime_type, size_bytes, chunk_count, summary, created_at
      ) VALUES (
        @id, @knowledgeBaseId, @name, @sourceType, @mimeType, @sizeBytes, @chunkCount, @summary, @createdAt
      )
    `
  );

  insertIfEmpty(
    "agents",
    seedAgents,
    () => `
      INSERT INTO agents (
        id, name, role, model_binding, prompt_template, knowledge_scope, created_at
      ) VALUES (
        @id, @name, @role, @modelBinding, @promptTemplate, @knowledgeScope, @createdAt
      )
    `
  );

  syncSeedKnowledgeCounts();
  ensureWorkspaceAgents();
}
