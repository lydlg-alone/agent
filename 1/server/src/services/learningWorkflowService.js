import { createId } from "../utils/id.js";
import { getDb } from "../config/database.js";

export function diagnose(payload) {
  return {
    id: createId("diag"),
    goal: payload.goal,
    level: payload.level || "中级",
    weakPoints: [
      "基础概念掌握不稳定",
      "典型例题迁移能力偏弱",
      "错题复盘频率不足"
    ],
    recommendedPath: [
      "先完成基础概念梳理",
      "再进行例题拆解练习",
      "最后进入综合测试与错题回放"
    ]
  };
}

export function plan(payload) {
  const db = getDb();
  const stages = [
    { stage: 1, title: "基础概念学习", duration: "3 天", outcome: "理解核心术语与知识点结构" },
    { stage: 2, title: "例题讲解", duration: "2 天", outcome: "掌握常见解题路径" },
    { stage: 3, title: "专项练习", duration: "4 天", outcome: "按模块提升准确率" },
    { stage: 4, title: "综合测试", duration: "2 天", outcome: "完成整体验证" },
    { stage: 5, title: "错题复盘", duration: "1 天", outcome: "沉淀复盘卡片与学习建议" }
  ];

  const record = {
    id: createId("plan"),
    user_id: payload.userId || null,
    goal: payload.goal,
    difficulty: payload.difficulty || "中等",
    stages_json: JSON.stringify(stages),
    created_at: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO learning_plans (
      id, user_id, goal, difficulty, stages_json, created_at
    ) VALUES (
      @id, @user_id, @goal, @difficulty, @stages_json, @created_at
    )`
  ).run(record);

  return { ...record, stages };
}

export function generateResource(payload) {
  const db = getDb();
  const content = `# ${payload.topic}\n\n- 学习目标：${payload.goal}\n- 难度：${payload.difficulty}\n- 资源类型：${payload.resourceType}\n\n## 关键知识点\n1. 核心概念定义\n2. 常见易错点\n3. 典型例题拆解\n\n## 学习建议\n- 先阅读概念摘要\n- 再完成 3 道对应练习题\n- 最后复盘错题原因`;

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
