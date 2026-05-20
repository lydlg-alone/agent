import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";

const VECTOR_SIZE = 128;

function cleanFts5Query(query) {
  return String(query || "")
    .replace(/[*"():^~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const source = String(text || "").toLowerCase();
  const wordTokens = source
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 1200);

  const cjkTokens = Array.from(source.matchAll(/\p{Script=Han}/gu))
    .map((match) => match[0])
    .slice(0, 1200);

  return [...wordTokens, ...cjkTokens];
}

function hashToken(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function buildTextVector(text) {
  const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
  for (const token of tokenize(text)) {
    vector[hashToken(token) % VECTOR_SIZE] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return 0;
  }

  return left.reduce((sum, value, index) => sum + value * Number(right[index] || 0), 0);
}

function parseVector(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeKeywordScore(rank) {
  const value = Math.abs(Number(rank || 0));
  return value ? 1 / (1 + value) : 0.5;
}

function lexicalOverlapScore(query, content) {
  const queryTokens = new Set(tokenize(query));
  if (!queryTokens.size) {
    return 0;
  }

  const contentTokens = new Set(tokenize(content));
  let matched = 0;
  for (const token of queryTokens) {
    if (contentTokens.has(token)) {
      matched += 1;
    }
  }

  return matched / queryTokens.size;
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
      `INSERT INTO document_chunks (
        id, source_type, source_id, source_name, chunk_index, content, embedding_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const chunk of chunks) {
      const id = createId("chk");
      insert.run(
        id,
        sourceType,
        sourceId,
        sourceName,
        chunk.index,
        chunk.content,
        JSON.stringify(buildTextVector(`${sourceName}\n${chunk.content}`)),
        now
      );
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

function searchKeywordChunks(query, topK) {
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
                dc.embedding_json,
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
      keywordScore: normalizeKeywordScore(item.score),
      vectorScore: 0,
      rerankScore: 0,
      score: normalizeKeywordScore(item.score),
      embedding: parseVector(item.embedding_json)
    }));
  } catch {
    return [];
  }
}

function searchVectorChunks(query, candidateLimit) {
  const queryVector = buildTextVector(query);
  const rows = getDb()
    .prepare(
      `SELECT id, source_type, source_id, source_name, chunk_index, content, embedding_json
       FROM document_chunks
       ORDER BY created_at DESC
       LIMIT 500`
    )
    .all();

  return rows
    .map((item) => {
      const embedding = parseVector(item.embedding_json);
      const vectorScore = cosineSimilarity(queryVector, embedding);
      return {
        id: item.id,
        sourceType: item.source_type,
        sourceId: item.source_id,
        sourceName: item.source_name,
        chunkIndex: item.chunk_index,
        content: item.content,
        keywordScore: 0,
        vectorScore,
        rerankScore: 0,
        score: vectorScore,
        embedding
      };
    })
    .filter((item) => item.vectorScore > 0)
    .sort((a, b) => b.vectorScore - a.vectorScore)
    .slice(0, candidateLimit);
}

function mergeResults(results) {
  const merged = new Map();

  for (const item of results) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, { ...item });
      continue;
    }

    existing.keywordScore = Math.max(existing.keywordScore || 0, item.keywordScore || 0);
    existing.vectorScore = Math.max(existing.vectorScore || 0, item.vectorScore || 0);
  }

  return [...merged.values()];
}

function rerankChunks(query, results) {
  return results
    .map((item) => {
      const overlapScore = lexicalOverlapScore(query, `${item.sourceName}\n${item.content}`);
      const rerankScore =
        (Number(item.keywordScore || 0) * 0.36) +
        (Number(item.vectorScore || 0) * 0.44) +
        (overlapScore * 0.2);

      return {
        ...item,
        rerankScore,
        score: Number(rerankScore.toFixed(6))
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function searchChunks(query, { topK = 5, mode = "hybrid", rerank = true } = {}) {
  const normalizedMode = ["keyword", "vector", "hybrid"].includes(mode) ? mode : "hybrid";
  const candidateLimit = Math.max(topK * 4, 12);
  const keywordResults = normalizedMode === "vector" ? [] : searchKeywordChunks(query, candidateLimit);
  const vectorResults = normalizedMode === "keyword" ? [] : searchVectorChunks(query, candidateLimit);
  const merged = mergeResults([...keywordResults, ...vectorResults]);
  const ranked = rerank ? rerankChunks(query, merged) : merged.sort((a, b) => b.score - a.score);

  return ranked.slice(0, topK).map(({ embedding, ...item }) => item);
}

export function buildCitationPrompt(results) {
  if (!results.length) {
    return { promptText: "", citationMeta: [] };
  }

  const citationMeta = results.map((item, index) => ({
    refId: index + 1,
    sourceName: item.sourceName,
    chunkIndex: item.chunkIndex,
    score: item.score,
    snippet: item.content.slice(0, 120)
  }));

  const blocks = results.map((item, index) => {
    return `[REF:${index + 1}] 来源: ${item.sourceName} | 相关度: ${Number(item.score || 0).toFixed(3)}\n${item.content}`;
  });

  const promptText =
    "以下是从相关文档中检索到的内容片段，请结合这些内容回答问题。引用时请使用 [REF:N] 标记来源。\n\n" +
    blocks.join("\n\n");

  return { promptText, citationMeta };
}
