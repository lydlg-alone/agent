CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  current_goal TEXT,
  preference TEXT,
  level TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key_masked TEXT,
  model_id TEXT NOT NULL,
  context_length INTEGER DEFAULT 8192,
  temperature REAL DEFAULT 0.7,
  stream_enabled INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  vector_store TEXT NOT NULL,
  description TEXT,
  document_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id)
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  model_binding TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  knowledge_scope TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  goal TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  stages_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generated_resources (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT,
  resource_type TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT,
  question_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  analysis TEXT,
  difficulty TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  score REAL DEFAULT 0,
  feedback TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS mistakes (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL,
  cause TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (answer_id) REFERENCES answers(id)
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  model_config_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (model_config_id) REFERENCES model_configs(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  agent_statuses_json TEXT,
  attachments_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

CREATE TABLE IF NOT EXISTS chat_attachments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER DEFAULT 0,
  content_excerpt TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  summary TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id)
);
