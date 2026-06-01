export const seedModels = [
  {
    id: "model_deepseek",
    name: "DeepSeek 学习工作模型",
    provider: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyMasked: "sk-***",
    modelId: "deepseek-chat",
    contextLength: 32000,
    temperature: 0.7,
    streamEnabled: 1,
    isDefault: 1,
    createdAt: "2026-05-14T09:00:00.000Z"
  },
  {
    id: "model_qwen",
    name: "Qwen 知识问答模型",
    provider: "Qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyMasked: "sk-***",
    modelId: "qwen-plus",
    contextLength: 16000,
    temperature: 0.5,
    streamEnabled: 1,
    isDefault: 0,
    createdAt: "2026-05-14T09:10:00.000Z"
  }
];

export const seedKnowledgeBases = [
  {
    id: "kb_math",
    name: "高等数学知识库",
    category: "数学",
    status: "active",
    vectorStore: "SQLite + sqlite-vec",
    description: "包含极限、导数、积分与线性代数入门资料。",
    documentCount: 1,
    createdAt: "2026-05-14T09:15:00.000Z"
  },
  {
    id: "kb_js",
    name: "JavaScript 教程知识库",
    category: "编程",
    status: "active",
    vectorStore: "SQLite + sqlite-vec",
    description: "面向前端学习者的语法、异步与工程化知识。",
    documentCount: 1,
    createdAt: "2026-05-14T09:20:00.000Z"
  }
];

export const seedKnowledgeDocuments = [
  {
    id: "kdoc_math_01",
    knowledgeBaseId: "kb_math",
    name: "高等数学复习提纲.md",
    sourceType: "text",
    mimeType: "text/markdown",
    sizeBytes: 12340,
    chunkCount: 16,
    summary: "包含极限、导数、积分三大模块的基础定义与典型题型整理。",
    createdAt: "2026-05-14T09:22:00.000Z"
  },
  {
    id: "kdoc_js_01",
    knowledgeBaseId: "kb_js",
    name: "JavaScript 异步编程笔记.md",
    sourceType: "text",
    mimeType: "text/markdown",
    sizeBytes: 9820,
    chunkCount: 12,
    summary: "涵盖 Promise、async/await、事件循环和常见异步陷阱。",
    createdAt: "2026-05-14T09:24:00.000Z"
  }
];

export const seedAgents = [
  {
    id: "agent_diagnosis",
    name: "学情诊断智能体",
    role: "diagnosis",
    modelBinding: "DeepSeek",
    promptTemplate: "结合学习目标、基础测试与错题数据，输出薄弱点和建议路径。",
    knowledgeScope: "用户画像、答题历史、错题集",
    createdAt: "2026-05-14T09:30:00.000Z"
  },
  {
    id: "agent_planner",
    name: "学习规划智能体",
    role: "planning",
    modelBinding: "Qwen",
    promptTemplate: "输出阶段化学习计划，包含目标、周期、阶段成果和评估指标。",
    knowledgeScope: "知识库摘要、用户目标、能力等级",
    createdAt: "2026-05-14T09:35:00.000Z"
  }
];
