import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";
import { getSetting, setSetting } from "./appSettingsService.js";

const ACTIVE_AGENT_KEY = "active_agent_id";
const SYSTEM_ROLES = new Set(["retrieval", "planning"]);
const DEFAULT_MARKET_AGENTS = [
  {
    name: "默认学习助手",
    role: "general",
    model_binding: "DeepSeek",
    prompt_template: "适合日常问答、计划拆解、重点总结和知识讲解。",
    knowledge_scope: "通用知识库、用户当前目标、近期对话上下文"
  },
  {
    name: "考研政治导师",
    role: "politics",
    model_binding: "DeepSeek",
    prompt_template: "适合主观题框架梳理、观点提炼和背诵提纲整理。",
    knowledge_scope: "政治类知识库、论述题模板、近期复习资料"
  },
  {
    name: "代码学习助教",
    role: "coding",
    model_binding: "Qwen",
    prompt_template: "适合代码讲解、报错定位、练习设计和学习路线规划。",
    knowledge_scope: "编程知识库、上传附件、用户当前代码问题"
  }
];

function ensureMarketAgents() {
  const db = getDb();
  const existingRoles = new Set(
    db
      .prepare("SELECT role FROM agents WHERE role NOT IN ('retrieval', 'planning')")
      .all()
      .map((item) => item.role)
  );

  const insert = db.prepare(
    `INSERT INTO agents (
      id, name, role, model_binding, prompt_template, knowledge_scope, created_at
    ) VALUES (
      @id, @name, @role, @model_binding, @prompt_template, @knowledge_scope, @created_at
    )`
  );

  for (const agent of DEFAULT_MARKET_AGENTS) {
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

function mapAgent(agent) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    modelBinding: agent.model_binding,
    promptTemplate: agent.prompt_template,
    knowledgeScope: agent.knowledge_scope,
    createdAt: agent.created_at,
    isSystem: SYSTEM_ROLES.has(agent.role)
  };
}

function getAgentById(agentId) {
  ensureMarketAgents();
  const agent = getDb().prepare("SELECT * FROM agents WHERE id = ?").get(agentId);
  return agent ? mapAgent(agent) : null;
}

export function listAgents() {
  ensureMarketAgents();
  const db = getDb();

  return db
    .prepare(
      `SELECT *
       FROM agents
       ORDER BY CASE
         WHEN role IN ('general', 'politics', 'coding') THEN 0
         WHEN role IN ('retrieval', 'planning') THEN 2
         ELSE 1
       END, created_at ASC`
    )
    .all()
    .map(mapAgent);
}

export function getMarketAgents() {
  return listAgents().filter((agent) => !agent.isSystem);
}

export function getActiveAgent() {
  const marketAgents = getMarketAgents();
  const activeId = getSetting(ACTIVE_AGENT_KEY, "");
  return marketAgents.find((agent) => agent.id === activeId) || marketAgents[0] || null;
}

export function activateAgent(agentId) {
  const agent = getAgentById(agentId);
  if (!agent || agent.isSystem) {
    const error = new Error("智能体不存在。");
    error.statusCode = 404;
    throw error;
  }

  setSetting(ACTIVE_AGENT_KEY, agent.id);
  return agent;
}

export function createAgent(payload) {
  ensureMarketAgents();
  const db = getDb();
  const agent = {
    id: createId("agent"),
    name: payload.name,
    role: payload.role,
    model_binding: payload.modelBinding,
    prompt_template: payload.promptTemplate,
    knowledge_scope: payload.knowledgeScope,
    created_at: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO agents (
      id, name, role, model_binding, prompt_template, knowledge_scope, created_at
    ) VALUES (
      @id, @name, @role, @model_binding, @prompt_template, @knowledge_scope, @created_at
    )`
  ).run(agent);

  return mapAgent(agent);
}
