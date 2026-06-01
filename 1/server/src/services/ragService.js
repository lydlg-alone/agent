import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";

function cleanFts5Query(query) {
  return String(query || "")
    .replace(/[*"():^~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function insertFtsEntry(rowid, sourceName, content) {
  getDb()
    .prepare("INSERT INTO document_chunks_fts(rowid, source_name, content) VALUES (?, ?, ?)")
    .run(rowid, sourceName, content);
}

export function indexChunks(sourceType, sourceId, sourceName, chunks) {
  if (!chunks.length) {
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();

  db.transaction(() => {
    const oldRows = db
      .prepare("SELECT rowid FROM document_chunks WHERE source_type = ? AND source_id = ?")
      .all(sourceType, sourceId);

    for (const row of oldRows) {
      db.prepare("DELETE FROM document_chunks_fts WHERE rowid = ?").run(row.rowid);
    }

    db.prepare("DELETE FROM document_chunks WHERE source_type = ? AND source_id = ?").run(
      sourceType,
      sourceId
    );

    const insert = db.prepare(
      `INSERT INTO document_chunks (id, source_type, source_id, source_name, chunk_index, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (const chunk of chunks) {
      const id = createId("chk");
      insert.run(id, sourceType, sourceId, sourceName, chunk.index, chunk.content, now);
      const { rowid } = db.prepare("SELECT last_insert_rowid() AS rowid").get();
      insertFtsEntry(rowid, sourceName, chunk.content);
    }
  })();
}

export function removeChunks(sourceType, sourceId) {
  const db = getDb();
  db.transaction(() => {
    const rows = db
      .prepare("SELECT rowid FROM document_chunks WHERE source_type = ? AND source_id = ?")
      .all(sourceType, sourceId);

    for (const row of rows) {
      db.prepare("DELETE FROM document_chunks_fts WHERE rowid = ?").run(row.rowid);
    }

    db.prepare("DELETE FROM document_chunks WHERE source_type = ? AND source_id = ?").run(
      sourceType,
      sourceId
    );
  })();
}

export function searchChunks(query, { topK = 5 } = {}) {
  const cleaned = cleanFts5Query(query);
  if (!cleaned) {
    return [];
  }

  const db = getDb();
  try {
    const results = db
      .prepare(
        `SELECT dc.id, dc.source_type, dc.source_id, dc.source_name,
                dc.chunk_index, dc.content,
                rank AS score
         FROM document_chunks_fts fts
         JOIN document_chunks dc ON dc.rowid = fts.rowid
         WHERE document_chunks_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(cleaned, topK);

    return results.map((item) => ({
      id: item.id,
      sourceType: item.source_type,
      sourceId: item.source_id,
      sourceName: item.source_name,
      chunkIndex: item.chunk_index,
      content: item.content,
      score: typeof item.score === "number" ? item.score : 0
    }));
  } catch {
    return [];
  }
}

export function buildCitationPrompt(results) {
  if (!results.length) {
    return { promptText: "", citationMeta: [] };
  }

  const citationMeta = results.map((item, index) => ({
    refId: index + 1,
    sourceName: item.sourceName,
    chunkIndex: item.chunkIndex,
    snippet: item.content.slice(0, 120)
  }));

  const blocks = results.map((item, index) => {
    return `[REF:${index + 1}] 来源: ${item.sourceName}\n${item.content}`;
  });

  const promptText =
    "以下是从相关文档中检索到的内容片段，请结合这些内容回答问题。引用时请使用 [REF:N] 标记来源。\n\n" +
    blocks.join("\n\n");

  return { promptText, citationMeta };
}
