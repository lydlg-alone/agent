import { getDb } from "../config/database.js";

/**
 * 获取学习仪表盘总览数据
 * 从 SQLite 各表中聚合真实统计数据
 */
export function getOverviewStats() {
  const db = getDb();

  // ---- 基础计数 ----
  const sessionCount = safeCount(db, "chat_sessions");
  const messageCount = safeCount(db, "chat_messages");
  const userMessageCount = safeCountWhere(db, "chat_messages", "role = 'user'");
  const assistantMessageCount = safeCountWhere(db, "chat_messages", "role = 'assistant'");
  const docCount = safeCount(db, "knowledge_documents");
  const kbCount = safeCount(db, "knowledge_bases");
  const agentCount = safeCount(db, "agents");
  const questionCount = safeCount(db, "questions");
  const answerCount = safeCount(db, "answers");
  const resourceCount = safeCount(db, "generated_resources");
  const planCount = safeCount(db, "learning_plans");

  // bookmark support (column may not exist yet — graceful fallback)
  let bookmarkCount = 0;
  try {
    bookmarkCount = safeCountWhere(db, "chat_messages", "bookmarked = 1");
  } catch {
    // column doesn't exist — skip
  }

  // ---- 知识库文档总大小 ----
  const totalDocSize = db
    .prepare("SELECT COALESCE(SUM(size_bytes), 0) AS total FROM knowledge_documents")
    .get()?.total || 0;

  // ---- 最近 7 天每日消息活跃度 ----
  const dailyActivity = db
    .prepare(
      `SELECT
        DATE(created_at) AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) AS user_count,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) AS assistant_count
       FROM chat_messages
       WHERE created_at >= DATE('now', '-7 days')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all();

  // ---- 最近 30 天练习得分趋势 ----
  const scoreTrend = db
    .prepare(
      `SELECT
        DATE(created_at) AS day,
        ROUND(AVG(score), 1) AS avg_score,
        COUNT(*) AS count
       FROM answers
       WHERE created_at >= DATE('now', '-30 days')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all();

  // ---- 文档类型分布 ----
  const docTypeDistribution = db
    .prepare(
      `SELECT
        source_type AS type,
        COUNT(*) AS count,
        COALESCE(SUM(size_bytes), 0) AS total_size
       FROM knowledge_documents
       GROUP BY source_type
       ORDER BY count DESC`
    )
    .all();

  // ---- 最近导入的 5 份文档 ----
  const recentDocuments = db
    .prepare(
      `SELECT id, name, source_type, size_bytes, created_at
       FROM knowledge_documents
       ORDER BY created_at DESC
       LIMIT 5`
    )
    .all()
    .map((d) => ({
      id: d.id,
      name: d.name,
      sourceType: d.source_type,
      sizeBytes: d.size_bytes,
      createdAt: d.created_at
    }));

  // ---- 最近 5 个会话 ----
  const recentSessions = db
    .prepare(
      `SELECT
        s.id,
        s.title,
        s.updated_at,
        COUNT(m.id) AS message_count
       FROM chat_sessions s
       LEFT JOIN chat_messages m ON m.session_id = s.id
       GROUP BY s.id
       ORDER BY s.updated_at DESC
       LIMIT 5`
    )
    .all()
    .map((s) => ({
      id: s.id,
      title: s.title,
      updatedAt: s.updated_at,
      messageCount: s.message_count
    }));

  // ---- 练习概览 ----
  const practiceSummary = {
    totalQuestions: questionCount,
    totalAnswers: answerCount,
    avgScore:
      db
        .prepare("SELECT ROUND(AVG(score), 1) AS avg FROM answers")
        .get()?.avg || 0
  };

  return {
    counts: {
      sessions: sessionCount,
      messages: messageCount,
      userMessages: userMessageCount,
      assistantMessages: assistantMessageCount,
      documents: docCount,
      knowledgeBases: kbCount,
      agents: agentCount,
      questions: questionCount,
      answers: answerCount,
      resources: resourceCount,
      plans: planCount,
      bookmarks: bookmarkCount,
      totalDocSizeBytes: totalDocSize
    },
    dailyActivity,
    scoreTrend,
    docTypeDistribution,
    recentDocuments,
    recentSessions,
    practiceSummary
  };
}

function safeCount(db, table) {
  try {
    return db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()?.c || 0;
  } catch {
    return 0;
  }
}

function safeCountWhere(db, table, whereClause) {
  try {
    return db.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ${whereClause}`).get()?.c || 0;
  } catch {
    return 0;
  }
}
