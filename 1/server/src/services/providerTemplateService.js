const PROVIDER_TEMPLATES = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat"
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini"
  },
  {
    id: "qwen",
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus"
  },
  {
    id: "ollama",
    name: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.1"
  },
  {
    id: "custom",
    name: "自定义",
    baseUrl: "",
    defaultModel: ""
  }
];

export function getProviderTemplates() {
  return PROVIDER_TEMPLATES;
}

export function getProviderTemplate(id) {
  return PROVIDER_TEMPLATES.find((t) => t.id === id) || null;
}
