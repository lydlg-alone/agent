import axios from "axios";
import { getDb } from "../config/database.js";
import { getCurrentModelConfig } from "./modelConfigService.js";
import { listNotesByStudySet } from "./noteService.js";
import { getRuntimeCredentials } from "./runtimeConfigService.js";
import { getStudySetById } from "./studySetService.js";
import { createId } from "../utils/id.js";

function buildApiUrl(baseUrl, targetPath) {
  return `${String(baseUrl || "").trim().replace(/\/+$/, "")}/${String(targetPath || "").replace(/^\/+/, "")}`;
}

function getModelRuntime() {
  const runtime = getRuntimeCredentials();
  const currentModel = getCurrentModelConfig();
  const modelId = String(runtime.modelId || currentModel?.modelId || "").trim();

  if (!runtime.baseUrl || !runtime.apiKey || !modelId) {
    const error = new Error("请先在模型配置页面完成 API 地址、API Key 和模型 ID 配置，再生成学习路径。");
    error.statusCode = 400;
    throw error;
  }

  return {
    baseUrl: runtime.baseUrl,
    apiKey: runtime.apiKey,
    modelId,
    systemPrompt: String(runtime.systemPrompt || "").trim()
  };
}

function summarizeNotes(studySetId) {
  if (!studySetId) {
    return [];
  }

  return listNotesByStudySet(studySetId)
    .slice(0, 5)
    .map((note) => ({
      title: note.title,
      content: String(note.content || "").replace(/\s+/g, " ").trim().slice(0, 280)
    }))
    .filter((note) => note.title || note.content);
}

function buildStudySetContext(studySetId) {
  if (!studySetId) {
    return null;
  }

  const studySet = getStudySetById(studySetId);
  return {
    studySet,
    notes: summarizeNotes(studySetId)
  };
}

function buildPlanningPrompt(payload, studySetContext) {
  const tags = studySetContext?.studySet?.tags?.length ? studySetContext.studySet.tags.join("、") : "无";
  const noteLines = (studySetContext?.notes || [])
    .map((note, index) => `${index + 1}. ${note.title || "未命名笔记"}：${note.content || "无内容摘要"}`)
    .join("\n");

  return [
    "你是学习路径规划助手。",
    "请基于用户目标和学习集上下文，输出一个学习路径 JSON。",
    "要求：",
    "1. 仅返回 JSON，不要输出 Markdown、解释或额外文本。",
    "2. JSON 结构必须是 {\"goal\":\"\",\"difficulty\":\"\",\"stages\":[...]}。",
    "3. difficulty 只能是 beginner、intermediate、advanced 之一。",
    "4. stages 必须是 4 到 8 个阶段的数组。",
    "5. 每个阶段包含 title、description、duration、type、completed 字段。",
    "6. completed 一律返回 false。",
    "7. duration 用中文字符串表达，例如“2 天”或“90 分钟”。",
    "",
    `学习目标：${payload.goal}`,
    `难度：${payload.difficulty}`,
    studySetContext
      ? [
          `学习集标题：${studySetContext.studySet.title}`,
          `学习集描述：${studySetContext.studySet.description || "无"}`,
          `考试科目：${studySetContext.studySet.examSubject || "无"}`,
          `标签：${tags}`,
          noteLines ? `学习集笔记摘要：\n${noteLines}` : "学习集笔记摘要：无"
        ].join("\n")
      : "未选择学习集，请仅基于学习目标生成。"
  ].join("\n");
}

function normalizeDifficulty(value) {
  return ["beginner", "intermediate", "advanced"].includes(value) ? value : "intermediate";
}

function sanitizeStage(stage, index) {
  return {
    stage: index + 1,
    title: String(stage?.title || `阶段 ${index + 1}`).trim(),
    description: String(stage?.description || stage?.outcome || "").trim(),
    duration: String(stage?.duration || "1 天").trim(),
    type: String(stage?.type || "学习任务").trim(),
    completed: false
  };
}

function extractAssistantContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item?.type === "text") {
          return item.text || "";
        }
        return "";
      })
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  return "";
}

function parsePlanPayload(rawText) {
  const normalized = String(rawText || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const match = normalized.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : normalized;
  const parsed = JSON.parse(jsonText);
  const stages = Array.isArray(parsed?.stages) ? parsed.stages : [];

  if (!stages.length) {
    throw new Error("模型返回的学习路径不包含有效阶段。");
  }

  return {
    goal: String(parsed.goal || "").trim(),
    difficulty: normalizeDifficulty(String(parsed.difficulty || "").trim()),
    stages: stages.slice(0, 8).map(sanitizeStage)
  };
}

async function requestAiPlan(payload, studySetContext) {
  const runtime = getModelRuntime();
  const messages = [];

  if (runtime.systemPrompt) {
    messages.push({
      role: "system",
      content: runtime.systemPrompt
    });
  }

  messages.push({
    role: "system",
    content: "你负责生成结构化学习路径，必须严格输出 JSON。"
  });
  messages.push({
    role: "user",
    content: buildPlanningPrompt(payload, studySetContext)
  });

  const response = await axios.post(
    buildApiUrl(runtime.baseUrl, "/chat/completions"),
    {
      model: runtime.modelId,
      messages,
      temperature: 0.5
    },
    {
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );

  const content = extractAssistantContent(response.data);
  if (!content) {
    throw new Error("模型接口调用成功，但没有返回可解析的学习路径内容。");
  }

  return parsePlanPayload(content);
}

export function diagnose(payload) {
  return {
    id: createId("diag"),
    goal: payload.goal,
    level: payload.level || "中级",
    weakPoints: ["基础概念掌握不稳定", "典型例题迁移能力偏弱", "错题复盘频率不足"],
    recommendedPath: ["先完成基础概念梳理", "再进行例题拆解练习", "最后进入综合测试与错题回放"]
  };
}

export async function plan(payload) {
  const db = getDb();
  const studySetId = String(payload.studySetId || "").trim();
  const studySetContext = buildStudySetContext(studySetId);
  const aiPlan = await requestAiPlan(payload, studySetContext);
  const record = {
    id: createId("plan"),
    user_id: payload.userId || null,
    goal: aiPlan.goal || payload.goal,
    difficulty: aiPlan.difficulty || normalizeDifficulty(payload.difficulty),
    study_set_id: studySetId || null,
    stages_json: JSON.stringify(aiPlan.stages),
    created_at: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO learning_plans (
      id, user_id, goal, difficulty, study_set_id, stages_json, created_at
    ) VALUES (
      @id, @user_id, @goal, @difficulty, @study_set_id, @stages_json, @created_at
    )`
  ).run(record);

  return {
    ...record,
    studySetId: record.study_set_id,
    studySetTitle: studySetContext?.studySet?.title || "",
    stages: aiPlan.stages
  };
}

export function generateResource(payload) {
  const db = getDb();
  const content = `# ${payload.topic}

- 学习目标：${payload.goal}
- 难度：${payload.difficulty}
- 资源类型：${payload.resourceType}

## 关键知识点
1. 核心概念定义
2. 常见易错点
3. 典型例题拆解

## 学习建议
- 先阅读概念摘要
- 再完成 3 道对应练习题
- 最后复盘错题原因`;

  const record = {
    id: createId("res"),
    knowledge_base_id: payload.knowledgeBaseId || null,
    resource_type: payload.resourceType,
    title: payload.topic,
    difficulty: payload.difficulty || "中等",
    content,
    created_at: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO generated_resources (
      id, knowledge_base_id, resource_type, title, difficulty, content, created_at
    ) VALUES (
      @id, @knowledge_base_id, @resource_type, @title, @difficulty, @content, @created_at
    )`
  ).run(record);

  return record;
}

export function generatePractice(payload) {
  const db = getDb();
  const record = {
    id: createId("q"),
    knowledge_base_id: payload.knowledgeBaseId || null,
    question_type: payload.questionType || "简答题",
    prompt: `请围绕“${payload.topic}”说明核心原理，并给出一个典型应用场景。`,
    answer: "核心原理应覆盖定义、关键步骤和适用条件；应用场景应体现知识迁移。",
    analysis: "重点考察对知识点的结构化表达和案例迁移能力。",
    difficulty: payload.difficulty || "中等",
    created_at: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO questions (
      id, knowledge_base_id, question_type, prompt, answer, analysis, difficulty, created_at
    ) VALUES (
      @id, @knowledge_base_id, @question_type, @prompt, @answer, @analysis, @difficulty, @created_at
    )`
  ).run(record);

  return record;
}

export function evaluateAnswer(payload) {
  const db = getDb();
  const score = payload.answerText?.length > 40 ? 88 : 72;
  const record = {
    id: createId("ans"),
    question_id: payload.questionId,
    answer_text: payload.answerText,
    score,
    feedback: score >= 80 ? "结构完整，建议补充更具体的案例。" : "概念较散，需要补足定义与推导过程。",
    created_at: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO answers (
      id, question_id, answer_text, score, feedback, created_at
    ) VALUES (
      @id, @question_id, @answer_text, @score, @feedback, @created_at
    )`
  ).run(record);

  return {
    ...record,
    mistakeSummary: score >= 80 ? [] : ["概念定义不完整", "例子与题干知识点关联不强"],
    nextStep: score >= 80 ? "进入综合测试阶段" : "回到对应知识点讲义进行复习"
  };
}
