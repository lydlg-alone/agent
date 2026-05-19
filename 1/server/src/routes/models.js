import { createModel, getCurrentModelConfig, listModels, testModelConnection } from "../services/modelConfigService.js";
import {
  detectCurrentModel,
  getRuntimeSettings,
  registerRuntimeSettingsStream,
  saveRuntimeSettings,
  testRuntimeSettings
} from "../services/runtimeConfigService.js";
import {
  clearConnectionHistory,
  getConnectionHistory,
  getRecentSuccessfulModels
} from "../services/connectionHistoryService.js";
import { getProviderTemplates } from "../services/providerTemplateService.js";
import {
  defineObjectSchema,
  optionalBooleanField,
  optionalNumberField,
  optionalStringField,
  stringField,
  validateBody
} from "../utils/schemaValidation.js";

const runtimePayloadSchema = defineObjectSchema(
  {
    provider: optionalStringField("供应商", { maxLength: 80, defaultValue: "" }),
    baseUrl: optionalStringField("API Base URL", { maxLength: 500, defaultValue: "" }),
    apiKey: optionalStringField("API Key", { maxLength: 500, defaultValue: "" }),
    systemPrompt: optionalStringField("系统提示词", { maxLength: 12000, defaultValue: "" }),
    modelId: optionalStringField("模型 ID", { maxLength: 160, defaultValue: "" })
  },
  "模型运行时配置"
);

const createModelSchema = defineObjectSchema(
  {
    name: stringField("模型名称", { maxLength: 120 }),
    provider: stringField("供应商", { maxLength: 80 }),
    baseUrl: stringField("API Base URL", { maxLength: 500 }),
    apiKey: optionalStringField("API Key", { maxLength: 500, defaultValue: "" }),
    modelId: stringField("模型 ID", { maxLength: 160 }),
    systemPrompt: optionalStringField("系统提示词", { maxLength: 12000, defaultValue: "" }),
    contextLength: optionalNumberField("上下文长度", {
      integer: true,
      min: 1,
      max: 2_000_000,
      defaultValue: 8192
    }),
    temperature: optionalNumberField("温度参数", {
      min: 0,
      max: 2,
      defaultValue: 0.7
    }),
    streamEnabled: optionalBooleanField("流式输出", { defaultValue: true }),
    isDefault: optionalBooleanField("默认模型", { defaultValue: false })
  },
  "创建模型请求"
);

const modelTestSchema = defineObjectSchema(
  {
    name: optionalStringField("模型名称", { maxLength: 120, defaultValue: "" }),
    provider: optionalStringField("供应商", { maxLength: 80, defaultValue: "" }),
    baseUrl: optionalStringField("API Base URL", { maxLength: 500, defaultValue: "" }),
    apiKey: optionalStringField("API Key", { maxLength: 500, defaultValue: "" }),
    systemPrompt: optionalStringField("系统提示词", { maxLength: 12000, defaultValue: "" }),
    modelId: optionalStringField("模型 ID", { maxLength: 160, defaultValue: "" }),
    contextLength: optionalNumberField("上下文长度", {
      integer: true,
      min: 1,
      max: 2_000_000,
      defaultValue: 8192
    }),
    temperature: optionalNumberField("温度参数", {
      min: 0,
      max: 2,
      defaultValue: 0.7
    }),
    streamEnabled: optionalBooleanField("流式输出", { defaultValue: true }),
    isDefault: optionalBooleanField("默认模型", { defaultValue: false })
  },
  "模型测试请求"
);

export function registerModelRoutes(app) {
  app.get("/api/models", (_req, res) => {
    res.json(listModels());
  });

  app.get("/api/models/current", (_req, res) => {
    res.json({
      settings: getRuntimeSettings(),
      currentModel: getCurrentModelConfig(),
      recentSuccessfulModels: getRecentSuccessfulModels()
    });
  });

  app.get("/api/models/current/stream", (req, res) => {
    const cleanup = registerRuntimeSettingsStream(res);

    req.on("close", () => {
      cleanup();
      res.end();
    });
  });

  app.post("/api/models", validateBody(createModelSchema), (req, res) => {
    res.status(201).json(createModel(req.validated.body));
  });

  app.post("/api/models/current", validateBody(runtimePayloadSchema), async (req, res, next) => {
    try {
      res.json(await saveRuntimeSettings(req.validated.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/models/current/detect", validateBody(runtimePayloadSchema), async (req, res, next) => {
    try {
      res.json(await detectCurrentModel(req.validated.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/models/test", validateBody(modelTestSchema), async (req, res, next) => {
    try {
      const payload = req.validated.body;
      const useRuntime = payload.baseUrl || payload.apiKey;
      res.json(useRuntime ? await testRuntimeSettings(payload) : testModelConnection(payload));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/models/templates", (_req, res) => {
    res.json(getProviderTemplates());
  });

  app.get("/api/models/history", (_req, res) => {
    res.json(getConnectionHistory());
  });

  app.delete("/api/models/history", (_req, res) => {
    clearConnectionHistory();
    res.json({ message: "连接历史已清空" });
  });

  app.get("/api/models/recent-successful", (_req, res) => {
    res.json(getRecentSuccessfulModels());
  });

  app.post("/api/models/export", (_req, res) => {
    const settings = getRuntimeSettings();
    const config = {
      provider: settings.provider,
      baseUrl: settings.baseUrl,
      modelId: settings.modelId,
      systemPrompt: settings.systemPrompt,
      exportedAt: new Date().toISOString()
    };
    res.json(config);
  });

  const importConfigSchema = defineObjectSchema(
    {
      provider: optionalStringField("供应商", { maxLength: 80, defaultValue: "" }),
      baseUrl: optionalStringField("API Base URL", { maxLength: 500, defaultValue: "" }),
      modelId: optionalStringField("模型 ID", { maxLength: 160, defaultValue: "" }),
      systemPrompt: optionalStringField("系统提示词", { maxLength: 12000, defaultValue: "" }),
      apiKey: optionalStringField("API Key", { maxLength: 500, defaultValue: "" })
    },
    "导入配置"
  );

  app.post("/api/models/import", validateBody(importConfigSchema), async (req, res, next) => {
    try {
      const payload = req.validated.body;
      const result = await saveRuntimeSettings({
        provider: payload.provider,
        baseUrl: payload.baseUrl,
        modelId: payload.modelId,
        systemPrompt: payload.systemPrompt,
        apiKey: payload.apiKey || ""
      });
      res.json({ message: "配置已导入", ...result });
    } catch (error) {
      next(error);
    }
  });
}
