import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";
import { isBinaryDocument, parseDocumentFromUpload } from "./documentParserService.js";
import { chunkText } from "./chunkingService.js";
import { indexChunks, removeChunks, searchChunks } from "./ragService.js";
import { fetchUrlContent } from "./webToolService.js";

const DEFAULT_KNOWLEDGE_BASE = {
  name: "默认知识库",
  category: "通用",
  status: "active",
  vectorStore: "SQLite + sqlite-vec",
  description: "用于承接前端导入的学习文档和资料摘录。"
};

export function listKnowledgeBases() {
  const db = getDb();
  return db.prepare("SELECT * FROM knowledge_bases ORDER BY created_at DESC").all();
}

function ensureDefaultKnowledgeBase() {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT *
       FROM knowledge_bases
       ORDER BY document_count DESC, created_at ASC
       LIMIT 1`
    )
    .get();

  if (existing) {
    return existing;
  }

  return createKnowledgeBase(DEFAULT_KNOWLEDGE_BASE);
}

function syncKnowledgeBaseDocumentCount(knowledgeBaseId) {
  const db = getDb();
  const count = db
    .prepare("SELECT COUNT(*) AS total FROM knowledge_documents WHERE knowledge_base_id = ?")
    .get(knowledgeBaseId)?.total;

  db.prepare("UPDATE knowledge_bases SET document_count = ? WHERE id = ?").run(Number(count || 0), knowledgeBaseId);
}

function detectSourceType(fileName, mimeType) {
  if (mimeType?.includes("html")) {
    return "web";
  }
  const ext = String(fileName || "").split(".").pop()?.toLowerCase() || "";
  if (mimeType?.includes("pdf") || ext === "pdf") {
    return "pdf";
  }
  if (["doc", "docx"].includes(ext)) {
    return "doc";
  }
  if (["ppt", "pptx"].includes(ext)) {
    return "ppt";
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return "sheet";
  }
  if (["md", "txt"].includes(ext)) {
    return "text";
  }
  return ext || "file";
}

function estimateChunks(sizeBytes, contentText = "") {
  const base = contentText ? Math.ceil(contentText.length / 800) : Math.ceil(Number(sizeBytes || 0) / 18000);
  return Math.max(1, Math.min(base || 1, 99));
}

function mapKnowledgeDocument(item) {
  return {
    id: item.id,
    knowledgeBaseId: item.knowledge_base_id,
    name: item.name,
    sourceType: item.source_type,
    mimeType: item.mime_type || "application/octet-stream",
    sizeBytes: Number(item.size_bytes || 0),
    chunkCount: Number(item.chunk_count || 0),
    summary: item.summary || "",
    createdAt: item.created_at,
    knowledgeBaseName: item.knowledge_base_name || ""
  };
}

export function createKnowledgeBase(payload) {
  const db = getDb();
  const item = {
    id: createId("kb"),
    name: payload.name,
    category: payload.category || "通用",
    status: payload.status || "draft",
    vector_store: payload.vectorStore || "SQLite + sqlite-vec",
    description: payload.description || "",
    document_count: 0,
    created_at: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO knowledge_bases (
      id, name, category, status, vector_store, description, document_count, created_at
    ) VALUES (
      @id, @name, @category, @status, @vector_store, @description, @document_count, @created_at
    )`
  ).run(item);

  return item;
}

export function listKnowledgeDocuments(search = "") {
  const db = getDb();
  const keyword = String(search || "").trim();
  const rows = keyword
    ? db
        .prepare(
          `SELECT d.*, kb.name AS knowledge_base_name
           FROM knowledge_documents d
           JOIN knowledge_bases kb ON kb.id = d.knowledge_base_id
           WHERE d.name LIKE ?
           ORDER BY d.created_at DESC`
        )
        .all(`%${keyword}%`)
    : db
        .prepare(
          `SELECT d.*, kb.name AS knowledge_base_name
           FROM knowledge_documents d
           JOIN knowledge_bases kb ON kb.id = d.knowledge_base_id
           ORDER BY d.created_at DESC`
        )
        .all();

  return rows.map(mapKnowledgeDocument);
}

export async function importKnowledgeDocuments(files = []) {
  const db = getDb();
  const knowledgeBase = ensureDefaultKnowledgeBase();
  const insert = db.prepare(
    `INSERT INTO knowledge_documents (
      id, knowledge_base_id, name, source_type, mime_type, size_bytes, chunk_count, summary, created_at
    ) VALUES (
      @id, @knowledge_base_id, @name, @source_type, @mime_type, @size_bytes, @chunk_count, @summary, @created_at
    )`
  );

  const now = Date.now();
  const docs = files.map((file, index) => ({
    id: createId("kdoc"),
    knowledge_base_id: knowledgeBase.id,
    name: file.name,
    source_type: detectSourceType(file.name, file.mimeType),
    mime_type: file.mimeType || "application/octet-stream",
    size_bytes: Number(file.sizeBytes || 0),
    chunk_count: estimateChunks(file.sizeBytes, file.contentText),
    summary: String(file.contentText || "").slice(0, 280),
    created_at: new Date(now + index).toISOString()
  }));

  db.transaction(() => {
    for (const doc of docs) {
      insert.run(doc);
    }
    syncKnowledgeBaseDocumentCount(knowledgeBase.id);
  })();

  for (const file of files) {
    const doc = docs.find((d) => d.name === file.name);
    if (!doc) {
      continue;
    }

    if (file.contentText) {
      try {
        const fullText = isBinaryDocument(file.name, file.mimeType)
          ? await parseDocumentFromUpload(file.name, file.mimeType, file.contentText)
          : String(file.contentText || "");

        if (!fullText) {
          continue;
        }

        db.prepare("UPDATE knowledge_documents SET summary = ? WHERE id = ?").run(
          fullText.slice(0, 280),
          doc.id
        );

        const chunks = chunkText(fullText);
        if (chunks.length) {
          indexChunks("knowledge_document", doc.id, doc.name, chunks);
          db.prepare("UPDATE knowledge_documents SET chunk_count = ? WHERE id = ?").run(
            chunks.length,
            doc.id
          );
        }
      } catch (parseError) {
        console.error(`Failed to parse knowledge document "${file.name}":`, parseError.message);
      }
    }
  }

  return listKnowledgeDocuments().filter((item) => docs.some((doc) => doc.id === item.id));
}

export async function importKnowledgeUrl(payload) {
  const page = await fetchUrlContent(payload.url);
  const imported = await importKnowledgeDocuments([
    {
      name: payload.title || page.title,
      mimeType: page.mimeType || "text/html",
      sizeBytes: Buffer.byteLength(page.text, "utf8"),
      contentText: [`来源 URL：${page.url}`, "", page.text].join("\n")
    }
  ]);

  return {
    ...imported[0],
    sourceUrl: page.url
  };
}

export function removeKnowledgeDocument(documentId) {
  const db = getDb();
  const doc = db.prepare("SELECT knowledge_base_id FROM knowledge_documents WHERE id = ?").get(documentId);
  if (!doc) {
    const error = new Error("知识文档不存在。");
    error.statusCode = 404;
    throw error;
  }

  removeChunks("knowledge_document", documentId);
  db.prepare("DELETE FROM knowledge_documents WHERE id = ?").run(documentId);
  syncKnowledgeBaseDocumentCount(doc.knowledge_base_id);
}

export function clearKnowledgeDocuments() {
  const db = getDb();
  const baseIds = db.prepare("SELECT DISTINCT knowledge_base_id FROM knowledge_documents").all();
  const docIds = db.prepare("SELECT id FROM knowledge_documents").all().map((r) => r.id);
  for (const docId of docIds) {
    removeChunks("knowledge_document", docId);
  }
  db.prepare("DELETE FROM knowledge_documents").run();
  for (const item of baseIds) {
    syncKnowledgeBaseDocumentCount(item.knowledge_base_id);
  }
}

export function addDocument(knowledgeBaseId, payload) {
  const db = getDb();
  const doc = {
    id: createId("doc"),
    knowledge_base_id: knowledgeBaseId,
    title: payload.title,
    source_type: payload.sourceType || "markdown",
    status: "parsed",
    chunk_count: Number(payload.chunkCount || 24),
    created_at: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO documents (
      id, knowledge_base_id, title, source_type, status, chunk_count, created_at
    ) VALUES (
      @id, @knowledge_base_id, @title, @source_type, @status, @chunk_count, @created_at
    )`
  ).run(doc);

  db.prepare("UPDATE knowledge_bases SET document_count = document_count + 1 WHERE id = ?").run(knowledgeBaseId);

  db.prepare(
    `INSERT INTO knowledge_documents (
      id, knowledge_base_id, name, source_type, mime_type, size_bytes, chunk_count, summary, created_at
    ) VALUES (
      @id, @knowledge_base_id, @name, @source_type, @mime_type, @size_bytes, @chunk_count, @summary, @created_at
    )`
  ).run({
    id: doc.id,
    knowledge_base_id: knowledgeBaseId,
    name: payload.title,
    source_type: payload.sourceType || "markdown",
    mime_type: "text/plain",
    size_bytes: Number(payload.sizeBytes || 0),
    chunk_count: doc.chunk_count,
    summary: String(payload.summary || "").slice(0, 280),
    created_at: doc.created_at
  });

  return doc;
}

export function retrievalTest(knowledgeBaseId, payload) {
  const db = getDb();
  const knowledgeBase = db.prepare("SELECT * FROM knowledge_bases WHERE id = ?").get(knowledgeBaseId);
  const mode = payload.mode || payload.searchMode || "hybrid";
  const results = searchChunks(payload.query, {
    topK: Number(payload.topK || 3),
    mode,
    rerank: payload.rerank !== false
  });

  return {
    knowledgeBaseId,
    knowledgeBaseName: knowledgeBase?.name || "未知知识库",
    query: payload.query,
    topK: Number(payload.topK || 3),
    mode,
    results: results.map((item) => ({
      chunkId: item.id,
      sourceName: item.sourceName,
      score: item.score,
      snippet: item.content.slice(0, 220)
    }))
  };
}
