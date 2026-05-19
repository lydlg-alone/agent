import { getDb } from "../config/database.js";
import { readApiConfigFile, writeApiConfigFile } from "./apiConfigFileService.js";

function buildMaskedKey(apiKey) {
  const normalized = String(apiKey || "").trim();
  return normalized ? `${normalized.slice(0, 3)}***` : "";
}

function buildRuntimeModelConfig(fileConfig) {
  const provider = String(fileConfig?.provider || "").trim();
  const modelId = String(fileConfig?.modelId || "").trim();
  const baseUrl = String(fileConfig?.baseUrl || "").trim();
  const apiKey = String(fileConfig?.apiKey || "").trim();

  if (!provider || !modelId || !baseUrl) {
    return null;
  }

  return {
    id: "runtime_file_config",
    name: `${provider} ${modelId}`,
    provider,
    baseUrl,
    apiKeyMasked: buildMaskedKey(apiKey),
    modelId,
    contextLength: 8192,
    temperature: 0.7,
    streamEnabled: true,
    isDefault: true,
    createdAt: fileConfig?.updatedAt || ""
  };
}

export function listModels() {
  const currentModel = getCurrentModelConfig();
  return currentModel ? [currentModel] : [];
}

export function getCurrentModelConfig() {
  return buildRuntimeModelConfig(readApiConfigFile());
}

export function createModel(payload) {
  const currentConfig = readApiConfigFile();

  writeApiConfigFile({
    provider: payload.provider,
    baseUrl: payload.baseUrl,
    apiKey: payload.apiKey,
    systemPrompt: String(payload.systemPrompt ?? currentConfig?.systemPrompt ?? "").trim(),
    modelId: payload.modelId,
    updatedAt: new Date().toISOString()
  });

  clearInternalApiConfig();
  return getCurrentModelConfig();
}

export function clearInternalApiConfig() {
  const db = getDb();

  db.prepare(
    `DELETE FROM app_settings
     WHERE key IN ('api_key', 'base_url', 'system_prompt', 'provider_hint', 'model_id_hint')`
  ).run();

  db.prepare(
    `UPDATE model_configs
     SET base_url = '',
         api_key_masked = '',
         is_default = 0`
  ).run();
}

export function upsertDefaultModelConfig(payload) {
  return createModel(payload);
}

export function testModelConnection(payload) {
  return {
    success: true,
    provider: payload.provider,
    modelId: payload.modelId,
    latencyMs: 420,
    checkedAt: new Date().toISOString(),
    message: "当前为示例连接检测，尚未调用真实模型接口。"
  };
}
