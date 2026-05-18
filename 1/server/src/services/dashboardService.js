import { getDb } from "../config/database.js";

export function getDashboardSummary() {
  const db = getDb();
  const counts = {
    models: db.prepare("SELECT COUNT(*) AS total FROM model_configs").get().total,
    knowledgeBases: db.prepare("SELECT COUNT(*) AS total FROM knowledge_bases").get().total,
    agents: db.prepare("SELECT COUNT(*) AS total FROM agents").get().total,
    resources: db.prepare("SELECT COUNT(*) AS total FROM generated_resources").get().total
  };

  return {
    counts,
    workflow: [
      "诊断智能体分析当前水平",
      "规划智能体生成阶段路径",
      "资源智能体生成学习资料",
      "练习智能体生成题目与答案",
      "反馈智能体输出评分和优化建议"
    ],
    charts: {
      progressTrend: [52, 58, 65, 74, 81],
      accuracyTrend: [60, 66, 71, 79, 86]
    }
  };
}
