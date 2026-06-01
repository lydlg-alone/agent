import { getDb } from "../config/database.js";
import { readApiConfigFile } from "./apiConfigFileService.js";

const MOJIBAKE_PATTERNS = [
  "\u95b5",
  "\u95b8",
  "\u6fe1",
  "\u95ba",
  "\u745c",
  "\u7039",
  "\u6fde",
  "\u9420",
  "\u95bb",
  "\u7f02",
  "\u95c2",
  "\u5a34",
  "\u941f",
  "\u59d2",
  "\u93c2\u677f\u7f13\u7035\u7845\u763d",
  "\u59ab\u20ac\u7ef1\u3221\u6ae4\u9473\u6212\u7d8b",
  "\u699b\u6a3f\ue17b\u701b\ufe3f\u7bc4\u9354\u2542\u589c"
];

const CLEAN_AGENT_ROLES = {
  diagnosis: {
    name: "学情诊断智能体",
    model_binding: "DeepSeek",
    prompt_template: "结合学习目标、基础测试与错题数据，输出薄弱点、难度分层和建议路径。",
    knowledge_scope: "用户画像、答题历史、错题集"
  },
  planning: {
    name: "学习规划智能体",
    model_binding: "Qwen",
    prompt_template: "输出阶段化学习计划，包含目标、周期、阶段成果和评估指标。",
    knowledge_scope: "知识库摘要、用户目标、能力等级"
  },
  retrieval: {
    name: "检索智能体",
    model_binding: "DeepSeek",
    prompt_template: "从知识库和上传资料中检索与当前任务最相关的内容。",
    knowledge_scope: "知识库、附件、向量检索结果"
  },
  general: {
    name: "默认学习助手",
    model_binding: "DeepSeek",
    prompt_template: "适合日常问答、计划拆解、重点总结和知识讲解。",
    knowledge_scope: "通用知识库、用户当前目标、近期对话上下文"
  },
  politics: {
    name: "考研政治导师",
    model_binding: "DeepSeek",
    prompt_template: "适合主观题框架梳理、观点提炼和背诵提纲整理。",
    knowledge_scope: "政治类知识库、论述题模板、近期复习资料"
  },
  coding: {
    name: "代码学习助教",
    model_binding: "Qwen",
    prompt_template: "适合代码讲解、报错定位、练习设计和学习路线规划。",
    knowledge_scope: "编程知识库、上传附件、用户当前代码问题"
  }
};

const CLEAN_KNOWLEDGE_BASES = {
  kb_math: {
    name: "高等数学知识库",
    category: "数学",
    description: "包含极限、导数、积分与线性代数入门资料。"
  },
  kb_js: {
    name: "JavaScript 教程知识库",
    category: "编程",
    description: "面向前端学习者的语法、异步与工程化知识。"
  }
};

const CLEAN_KNOWLEDGE_DOCUMENTS = {
  kdoc_math_01: {
    name: "高等数学复习提纲.md",
    summary: "包含极限、导数、积分三大模块的基础定义与典型题型整理。"
  },
  kdoc_js_01: {
    name: "JavaScript 异步编程笔记.md",
    summary: "涵盖 Promise、async/await、事件循环和常见异步陷阱。"
  }
};

const CLEAN_MODELS = {
  model_deepseek: {
    name: "DeepSeek 学习工作模型",
    provider: "DeepSeek"
  },
  model_qwen: {
    name: "Qwen 知识问答模型",
    provider: "Qwen"
  }
};

function looksLikeMojibake(value) {
  const text = String(value || "");
  if (!text) {
    return false;
  }

  return MOJIBAKE_PATTERNS.some((pattern) => text.includes(pattern));
}

function buildIdleAgentStatuses(agents) {
  return agents.map((agent) => ({
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

function buildGreetingContent({ modelName, activeAgentName, agents, knowledgeBaseCount, documentCount, hasRuntimeModelAccess }) {
  return [
    `你好，我已经接入当前学习工作区，正在使用模型：${modelName || "未配置模型"}。`,
    activeAgentName ? `当前激活的学习智能体：${activeAgentName}。` : "当前还没有激活学习智能体。",
    `协同状态智能体：${agents.map((item) => item.name).join("、") || "暂无"}。`,
    `当前已连接 ${knowledgeBaseCount} 个知识库，共 ${documentCount} 份资料。`,
    hasRuntimeModelAccess
      ? "已检测到真实模型接入，后续问题会优先通过外部 AI 接口回答。"
      : "当前未接入外部模型，将使用本地演示回复。"
  ].join("\n");
}

export function repairLegacyTextData() {
  const db = getDb();

  const transaction = db.transaction(() => {
    for (const [role, clean] of Object.entries(CLEAN_AGENT_ROLES)) {
      const existing = db
        .prepare("SELECT id, name, model_binding, prompt_template, knowledge_scope FROM agents WHERE role = ?")
        .get(role);

      if (!existing) {
        continue;
      }

      if (
        looksLikeMojibake(existing.name) ||
        looksLikeMojibake(existing.model_binding) ||
        looksLikeMojibake(existing.prompt_template) ||
        looksLikeMojibake(existing.knowledge_scope)
      ) {
        db.prepare(
          `UPDATE agents
           SET name = ?,
               model_binding = ?,
               prompt_template = ?,
               knowledge_scope = ?
           WHERE id = ?`
        ).run(clean.name, clean.model_binding, clean.prompt_template, clean.knowledge_scope, existing.id);
      }
    }

    for (const [id, clean] of Object.entries(CLEAN_KNOWLEDGE_BASES)) {
      const existing = db.prepare("SELECT name, category, description FROM knowledge_bases WHERE id = ?").get(id);
      if (!existing) {
        continue;
      }

      if (looksLikeMojibake(existing.name) || looksLikeMojibake(existing.category) || looksLikeMojibake(existing.description)) {
        db.prepare(
          `UPDATE knowledge_bases
           SET name = ?,
               category = ?,
               description = ?
           WHERE id = ?`
        ).run(clean.name, clean.category, clean.description, id);
      }
    }

    for (const [id, clean] of Object.entries(CLEAN_KNOWLEDGE_DOCUMENTS)) {
      const existing = db.prepare("SELECT name, summary FROM knowledge_documents WHERE id = ?").get(id);
      if (!existing) {
        continue;
      }

      if (looksLikeMojibake(existing.name) || looksLikeMojibake(existing.summary)) {
        db.prepare(
          `UPDATE knowledge_documents
           SET name = ?,
               summary = ?
           WHERE id = ?`
        ).run(clean.name, clean.summary, id);
      }
    }

    for (const [id, clean] of Object.entries(CLEAN_MODELS)) {
      const existing = db.prepare("SELECT name, provider FROM model_configs WHERE id = ?").get(id);
      if (!existing) {
        continue;
      }

      if (looksLikeMojibake(existing.name) || looksLikeMojibake(existing.provider)) {
        db.prepare(
          `UPDATE model_configs
           SET name = ?,
               provider = ?
           WHERE id = ?`
        ).run(clean.name, clean.provider, id);
      }
    }

    db.prepare("UPDATE chat_sessions SET title = '新建对话' WHERE title = ?").run("\u93c2\u677f\u7f13\u7035\u7845\u763d");

    const workspaceAgents = db
      .prepare(
        `SELECT id, name, role
         FROM agents
         WHERE role IN ('retrieval', 'planning')
         ORDER BY CASE role
           WHEN 'retrieval' THEN 1
           WHEN 'planning' THEN 2
           ELSE 99
         END, created_at ASC`
      )
      .all();
    const activeAgentId = db.prepare("SELECT value FROM app_settings WHERE key = 'active_agent_id'").get()?.value || "";
    const activeAgent = activeAgentId
      ? db.prepare("SELECT name FROM agents WHERE id = ?").get(activeAgentId)
      : null;
    const model = db.prepare("SELECT name FROM model_configs WHERE is_default = 1 ORDER BY created_at DESC LIMIT 1").get();
    const runtimeConfig = readApiConfigFile();
    const knowledgeStats =
      db.prepare(
        `SELECT COUNT(*) AS knowledge_base_count,
                COALESCE(SUM(document_count), 0) AS document_count
         FROM knowledge_bases`
      ).get() || {};

    const greetingContent = buildGreetingContent({
      modelName: model?.name || "",
      activeAgentName: activeAgent?.name || "",
      agents: workspaceAgents,
      knowledgeBaseCount: Number(knowledgeStats.knowledge_base_count || 0),
      documentCount: Number(knowledgeStats.document_count || 0),
      hasRuntimeModelAccess: Boolean(runtimeConfig?.baseUrl && runtimeConfig?.apiKey)
    });

    const idleStatusesJson = JSON.stringify(buildIdleAgentStatuses(workspaceAgents));
    const assistantMessages = db
      .prepare("SELECT id, content, agent_statuses_json FROM chat_messages WHERE role = 'assistant'")
      .all();

    for (const message of assistantMessages) {
      const nextContent = looksLikeMojibake(message.content) ? greetingContent : message.content;
      const nextStatuses = looksLikeMojibake(message.agent_statuses_json) ? idleStatusesJson : message.agent_statuses_json;

      if (nextContent !== message.content || nextStatuses !== message.agent_statuses_json) {
        db.prepare(
          `UPDATE chat_messages
           SET content = ?,
               agent_statuses_json = ?
           WHERE id = ?`
        ).run(nextContent, nextStatuses, message.id);
      }
    }
  });

  transaction();
}
