import { getSettings, setSetting } from "./appSettingsService.js";
import { getCurrentModelConfig, upsertDefaultModelConfig } from "./modelConfigService.js";

const RUNTIME_KEYS = ["api_key", "base_url", "system_prompt", "provider_hint", "model_id_hint"];

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function inferProvider(baseUrl, providerHint = "") {
  const url = normalizeBaseUrl(baseUrl).toLowerCase();
  const hint = String(providerHint || "").trim();

  if (hint) {
    return hint;
  }

  if (url.includes("deepseek")) {
    return "DeepSeek";
  }

  if (url.includes("dashscope") || url.includes("qwen")) {
    return "Qwen";
  }

  if (url.includes("openai")) {
    return "OpenAI";
  }

  if (url.includes("ollama")) {
    return "Ollama";
  }

  return "OpenAI-Compatible";
}

function inferModelId({ baseUrl, provider, modelId }) {
  if (String(modelId || "").trim()) {
    return String(modelId).trim();
  }

  const providerName = String(provider || "").toLowerCase();
  const url = normalizeBaseUrl(baseUrl).toLowerCase();

  if (providerName.includes("deepseek") || url.includes("deepseek")) {
    return "deepseek-chat";
  }

  if (providerName.includes("qwen") || url.includes("dashscope")) {
    return "qwen-plus";
  }

  if (providerName.includes("openai") || url.includes("openai")) {
    return "gpt-4o-mini";
  }

  if (providerName.includes("ollama") || url.includes("ollama")) {
    return "llama3.1";
  }

  return "custom-chat";
}

function inferModelName(provider, modelId) {
  return `${provider} ${modelId}`;
}

export function getRuntimeSettings() {
  const settings = getSettings(RUNTIME_KEYS);
  const currentModel = getCurrentModelConfig();

  return {
    provider: settings.provider_hint || currentModel?.provider || "",
    baseUrl: settings.base_url || currentModel?.baseUrl || "",
    apiKey: "",
    apiKeyMasked: settings.api_key ? `${settings.api_key.slice(0, 3)}***` : currentModel?.apiKeyMasked || "",
    hasApiKey: Boolean(settings.api_key),
    systemPrompt: settings.system_prompt || "",
    modelId: settings.model_id_hint || currentModel?.modelId || "",
    currentModel
  };
}

export function detectCurrentModel(payload = {}) {
  const current = getRuntimeSettings();
  const baseUrl = normalizeBaseUrl(payload.baseUrl || current.baseUrl);
  const provider = inferProvider(baseUrl, payload.provider || current.provider);
  const model = inferModelId({
    baseUrl,
    provider,
    modelId: payload.modelId || current.modelId
  });

  return {
    provider,
    model,
    message: "已根据当前配置自动识别模型。"
  };
}

export function saveRuntimeSettings(payload = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(payload.baseUrl);
  const provider = inferProvider(normalizedBaseUrl, payload.provider);
  const detected = detectCurrentModel({
    baseUrl: normalizedBaseUrl,
    provider,
    modelId: payload.modelId
  });

  if (payload.apiKey !== undefined) {
    setSetting("api_key", payload.apiKey);
  }

  setSetting("base_url", normalizedBaseUrl);
  setSetting("system_prompt", payload.systemPrompt || "");
  setSetting("provider_hint", provider);
  setSetting("model_id_hint", detected.model);

  const current = upsertDefaultModelConfig({
    name: inferModelName(provider, detected.model),
    provider,
    baseUrl: normalizedBaseUrl,
    apiKey: payload.apiKey,
    apiKeyMasked: getRuntimeSettings().apiKeyMasked,
    modelId: detected.model,
    contextLength: 8192,
    temperature: 0.7,
    streamEnabled: true
  });

  return {
    message: "运行配置已保存。",
    settings: getRuntimeSettings(),
    currentModel: current
  };
}

export function testRuntimeSettings(payload = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(payload.baseUrl);
  const provider = inferProvider(normalizedBaseUrl, payload.provider);
  const detected = detectCurrentModel({
    baseUrl: normalizedBaseUrl,
    provider,
    modelId: payload.modelId
  });

  return {
    success: Boolean(normalizedBaseUrl && payload.apiKey),
    provider,
    model: detected.model,
    checkedAt: new Date().toISOString(),
    latencyMs: 320,
    message:
      normalizedBaseUrl && payload.apiKey
        ? "已完成本地连通性模拟校验。"
        : "缺少 API Base URL 或 API Key，无法完成校验。"
  };
}
