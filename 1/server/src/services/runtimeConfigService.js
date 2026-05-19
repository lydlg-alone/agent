import axios from "axios";
import {
  getApiConfigDirectoryPath,
  getApiConfigFilePath,
  readApiConfigFile,
  subscribeApiConfigChanges,
  writeApiConfigFile
} from "./apiConfigFileService.js";
import { clearInternalApiConfig, getCurrentModelConfig } from "./modelConfigService.js";
import { recordConnection } from "./connectionHistoryService.js";

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function buildApiUrl(baseUrl, targetPath) {
  return `${normalizeBaseUrl(baseUrl)}/${String(targetPath || "").replace(/^\/+/, "")}`;
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

function maskApiKey(apiKey) {
  const normalized = String(apiKey || "").trim();
  return normalized ? `${normalized.slice(0, 3)}***` : "";
}

async function fetchRemoteModels({ baseUrl, apiKey }) {
  const response = await axios.get(buildApiUrl(baseUrl, "/models"), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    timeout: 15000
  });

  return Array.isArray(response.data?.data) ? response.data.data : [];
}

function pickRemoteModel(models, preferredModelId = "") {
  const preferred = String(preferredModelId || "").trim().toLowerCase();

  if (preferred) {
    const matched = models.find((item) => String(item?.id || "").toLowerCase() === preferred);
    if (matched?.id) {
      return matched.id;
    }
  }

  const firstAvailable = models.find((item) => typeof item?.id === "string" && item.id.trim());
  return firstAvailable?.id || "";
}

function getStoredRuntimeValues() {
  const fileConfig = readApiConfigFile();

  return {
    provider: String(fileConfig?.provider || "").trim(),
    baseUrl: String(fileConfig?.baseUrl || "").trim(),
    apiKey: String(fileConfig?.apiKey || "").trim(),
    systemPrompt: String(fileConfig?.systemPrompt || "").trim(),
    modelId: String(fileConfig?.modelId || "").trim(),
    updatedAt: String(fileConfig?.updatedAt || "").trim(),
    currentModel: getCurrentModelConfig()
  };
}

function buildRuntimeSettingsPayload() {
  return {
    settings: getRuntimeSettings(),
    currentModel: getCurrentModelConfig()
  };
}

export function getRuntimeCredentials() {
  return getStoredRuntimeValues();
}

export function getRuntimeSettings() {
  const runtime = getStoredRuntimeValues();

  return {
    provider: runtime.provider,
    baseUrl: runtime.baseUrl,
    apiKey: "",
    apiKeyMasked: maskApiKey(runtime.apiKey),
    hasApiKey: Boolean(runtime.apiKey),
    systemPrompt: runtime.systemPrompt,
    modelId: runtime.modelId,
    currentModel: runtime.currentModel,
    storageDirectory: getApiConfigDirectoryPath(),
    storagePath: getApiConfigFilePath()
  };
}

export function registerRuntimeSettingsStream(res) {
  const sendPayload = () => {
    res.write(`data: ${JSON.stringify(buildRuntimeSettingsPayload())}\n\n`);
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const unsubscribe = subscribeApiConfigChanges(() => {
    sendPayload();
  });

  sendPayload();

  const heartbeat = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 25000);

  return () => {
    clearInterval(heartbeat);
    unsubscribe();
  };
}

export async function detectCurrentModel(payload = {}) {
  const current = getStoredRuntimeValues();
  const baseUrl = normalizeBaseUrl(payload.baseUrl || current.baseUrl);
  const apiKey = String(payload.apiKey || current.apiKey || "").trim();
  const provider = inferProvider(baseUrl, payload.provider || current.provider);
  let model = inferModelId({
    baseUrl,
    provider,
    modelId: payload.modelId || current.modelId
  });

  if (baseUrl && apiKey) {
    try {
      const models = await fetchRemoteModels({ baseUrl, apiKey });
      const remoteModel = pickRemoteModel(models, payload.modelId || current.modelId);
      if (remoteModel) {
        model = remoteModel;
      }
      const availableModels = models
        .filter((item) => typeof item?.id === "string" && item.id.trim())
        .map((item) => ({ id: item.id, owned_by: item.owned_by || "" }));

      recordConnection({
        provider,
        baseUrl,
        modelId: model,
        success: true,
        latencyMs: 0,
        availableModels,
        message: remoteModel ? "已从远程模型列表自动识别当前模型。" : "已根据当前配置推断模型。"
      });

      return {
        provider,
        model,
        message: remoteModel ? "已从远程模型列表自动识别当前模型。" : "已根据当前配置推断模型。",
        availableModels
      };
    } catch (error) {
      recordConnection({
        provider,
        baseUrl,
        modelId: model,
        success: false,
        latencyMs: 0,
        message: `模型列表读取失败：${error.response?.data?.error?.message || error.message}`
      });

      return {
        provider,
        model,
        message: `模型列表读取失败，已回退为本地推断：${error.response?.data?.error?.message || error.message}`,
        availableModels: []
      };
    }
  }

  return {
    provider,
    model,
    message: "当前未提供完整凭据，已根据配置推断模型。",
    availableModels: []
  };
}

export async function saveRuntimeSettings(payload = {}) {
  const existing = getStoredRuntimeValues();
  const normalizedBaseUrl = normalizeBaseUrl(payload.baseUrl || existing.baseUrl);
  const provider = inferProvider(normalizedBaseUrl, payload.provider || existing.provider);
  const nextApiKey = String(payload.apiKey || "").trim() || existing.apiKey;
  const systemPrompt = String(payload.systemPrompt ?? existing.systemPrompt ?? "").trim();
  const detected = await detectCurrentModel({
    baseUrl: normalizedBaseUrl,
    apiKey: nextApiKey,
    provider,
    modelId: payload.modelId || existing.modelId
  });

  writeApiConfigFile({
    provider,
    baseUrl: normalizedBaseUrl,
    apiKey: nextApiKey,
    systemPrompt,
    modelId: detected.model,
    updatedAt: new Date().toISOString()
  });

  clearInternalApiConfig();

  return {
    message: `运行配置已保存到 ${getApiConfigDirectoryPath()}`,
    ...buildRuntimeSettingsPayload()
  };
}

export async function testRuntimeSettings(payload = {}) {
  const current = getStoredRuntimeValues();
  const normalizedBaseUrl = normalizeBaseUrl(payload.baseUrl || current.baseUrl);
  const apiKey = String(payload.apiKey || "").trim() || current.apiKey;
  const provider = inferProvider(normalizedBaseUrl, payload.provider || current.provider);

  if (!normalizedBaseUrl || !apiKey) {
    return {
      success: false,
      provider,
      model: String(payload.modelId || current.modelId || "").trim(),
      checkedAt: new Date().toISOString(),
      latencyMs: 0,
      message: "缺少 API Base URL 或 API Key，无法完成校验。",
      availableModels: []
    };
  }

  const startedAt = Date.now();
  let models = [];
  try {
    models = await fetchRemoteModels({ baseUrl: normalizedBaseUrl, apiKey });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    recordConnection({
      provider,
      baseUrl: normalizedBaseUrl,
      modelId: String(payload.modelId || current.modelId || "").trim(),
      success: false,
      latencyMs,
      message: error.response?.data?.error?.message || error.message
    });

    return {
      success: false,
      provider,
      model: String(payload.modelId || current.modelId || "").trim(),
      checkedAt: new Date().toISOString(),
      latencyMs,
      message: `连接失败：${error.response?.data?.error?.message || error.message}`,
      availableModels: []
    };
  }

  const detectedModel = pickRemoteModel(models, payload.modelId || current.modelId);
  const latencyMs = Date.now() - startedAt;
  const availableModels = models
    .filter((item) => typeof item?.id === "string" && item.id.trim())
    .map((item) => ({ id: item.id, owned_by: item.owned_by || "" }));

  recordConnection({
    provider,
    baseUrl: normalizedBaseUrl,
    modelId: detectedModel,
    success: true,
    latencyMs,
    availableModels,
    message: `连接成功，检测到 ${models.length} 个可用模型。`
  });

  return {
    success: true,
    provider,
    model: detectedModel,
    checkedAt: new Date().toISOString(),
    latencyMs,
    message: `连接成功，检测到 ${models.length} 个可用模型。`,
    availableModels
  };
}
