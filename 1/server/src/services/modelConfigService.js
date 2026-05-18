import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";
import { readApiConfigFile } from "./apiConfigFileService.js";

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
  const db = getDb();
  return db.prepare("SELECT * FROM model_configs ORDER BY created_at DESC").all();
}

export function getCurrentModelConfig() {
  const runtimeModel = buildRuntimeModelConfig(readApiConfigFile());
  if (runtimeModel) {
    return runtimeModel;
  }

  const db = getDb();
  const model = db
    .prepare(
      `SELECT id, name, provider, base_url, api_key_masked, model_id, context_length,
              temperature, stream_enabled, is_default, created_at
       FROM model_configs
       ORDER BY is_default DESC, created_at DESC
       LIMIT 1`
    )
    .get();

  if (!model) {
    return null;
  }

  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    baseUrl: model.base_url,
    apiKeyMasked: model.api_key_masked || "",
    modelId: model.model_id,
    contextLength: Number(model.context_length || 8192),
    temperature: Number(model.temperature || 0.7),
    streamEnabled: Boolean(model.stream_enabled),
    isDefault: Boolean(model.is_default),
    createdAt: model.created_at
  };
}

export function createModel(payload) {
  const db = getDb();
  const model = {
    id: createId("model"),
    name: payload.name,
    provider: payload.provider,
    base_url: payload.baseUrl,
    api_key_masked: payload.apiKey ? `${payload.apiKey.slice(0, 3)}***` : "",
    model_id: payload.modelId,
    context_length: Number(payload.contextLength || 8192),
    temperature: Number(payload.temperature || 0.7),
    stream_enabled: payload.streamEnabled ? 1 : 0,
    is_default: payload.isDefault ? 1 : 0,
    created_at: new Date().toISOString()
  };

  if (model.is_default) {
    db.prepare("UPDATE model_configs SET is_default = 0").run();
  }

  db.prepare(
    `INSERT INTO model_configs (
      id, name, provider, base_url, api_key_masked, model_id,
      context_length, temperature, stream_enabled, is_default, created_at
    ) VALUES (
      @id, @name, @provider, @base_url, @api_key_masked, @model_id,
      @context_length, @temperature, @stream_enabled, @is_default, @created_at
    )`
  ).run(model);

  return model;
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
         api_key_masked = ''
     WHERE is_default = 1`
  ).run();
}

export function upsertDefaultModelConfig(payload) {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id
       FROM model_configs
       WHERE is_default = 1
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get();

  db.prepare("UPDATE model_configs SET is_default = 0").run();

  const model = {
    id: existing?.id || createId("model"),
    name: payload.name,
    provider: payload.provider,
    base_url: payload.baseUrl,
    api_key_masked: payload.apiKey ? `${payload.apiKey.slice(0, 3)}***` : payload.apiKeyMasked || "",
    model_id: payload.modelId,
    context_length: Number(payload.contextLength || 8192),
    temperature: Number(payload.temperature || 0.7),
    stream_enabled: payload.streamEnabled ? 1 : 0,
    is_default: 1,
    created_at: payload.createdAt || new Date().toISOString()
  };

  if (existing) {
    db.prepare(
      `UPDATE model_configs
       SET name = @name,
           provider = @provider,
           base_url = @base_url,
           api_key_masked = @api_key_masked,
           model_id = @model_id,
           context_length = @context_length,
           temperature = @temperature,
           stream_enabled = @stream_enabled,
           is_default = @is_default
       WHERE id = @id`
    ).run(model);
  } else {
    db.prepare(
      `INSERT INTO model_configs (
        id, name, provider, base_url, api_key_masked, model_id,
        context_length, temperature, stream_enabled, is_default, created_at
      ) VALUES (
        @id, @name, @provider, @base_url, @api_key_masked, @model_id,
        @context_length, @temperature, @stream_enabled, @is_default, @created_at
      )`
    ).run(model);
  }

  return getCurrentModelConfig();
}

export function testModelConnection(payload) {
  return {
    success: true,
    provider: payload.provider,
    modelId: payload.modelId,
    latencyMs: 420,
    checkedAt: new Date().toISOString(),
    message: "示例实现未调用真实大模型接口，当前返回本地连通性模拟结果。"
  };
}
