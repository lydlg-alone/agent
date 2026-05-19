import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";

export function recordConnection({ provider, baseUrl, modelId, success, latencyMs, availableModels, message }) {
  const db = getDb();
  db.prepare(
    `INSERT INTO connection_history (id, provider, base_url, model_id, success, latency_ms, available_models_json, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    createId("conn"),
    provider || "",
    baseUrl || "",
    modelId || "",
    success ? 1 : 0,
    typeof latencyMs === "number" ? latencyMs : null,
    availableModels ? JSON.stringify(availableModels) : null,
    message || "",
    new Date().toISOString()
  );
}

export function getConnectionHistory(limit = 20) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, provider, base_url AS baseUrl, model_id AS modelId,
              success, latency_ms AS latencyMs, message, created_at AS createdAt
       FROM connection_history
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit);
}

export function getRecentSuccessfulModels(limit = 5) {
  const db = getDb();
  return db
    .prepare(
      `SELECT provider, base_url AS baseUrl, model_id AS modelId,
              MAX(created_at) AS lastUsedAt
       FROM connection_history
       WHERE success = 1
       GROUP BY provider, base_url, model_id
       ORDER BY lastUsedAt DESC
       LIMIT ?`
    )
    .all(limit);
}

export function clearConnectionHistory() {
  const db = getDb();
  db.exec("DELETE FROM connection_history");
}
