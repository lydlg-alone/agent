import { getDb } from "../config/database.js";

export function getSetting(key, fallback = "") {
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  const db = getDb();
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`
  ).run(key, String(value ?? ""), new Date().toISOString());
}

export function getSettings(keys) {
  const values = {};
  for (const key of keys) {
    values[key] = getSetting(key, "");
  }
  return values;
}
