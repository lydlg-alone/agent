import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.AGENT_DATA_DIR
  ? path.resolve(process.env.AGENT_DATA_DIR)
  : path.resolve(__dirname, "../../data");
const dbPath = path.join(dataDir, "app.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

export function getDb() {
  return db;
}

export function closeDb() {
  db.close();
}

export function bootstrapDatabase() {
  const schemaPath = path.resolve(__dirname, "../db/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);

  try {
    db.exec("ALTER TABLE chat_messages ADD COLUMN citations_json TEXT");
  } catch {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE chat_attachments ADD COLUMN content_data TEXT");
  } catch {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE document_chunks ADD COLUMN embedding_json TEXT");
  } catch {
    // Column already exists
  }
}
