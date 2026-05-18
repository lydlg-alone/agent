import { createModel, getCurrentModelConfig, listModels, testModelConnection } from "../services/modelConfigService.js";
import {
  detectCurrentModel,
  getRuntimeSettings,
  registerRuntimeSettingsStream,
  saveRuntimeSettings,
  testRuntimeSettings
} from "../services/runtimeConfigService.js";

export function registerModelRoutes(app) {
  app.get("/api/models", (_req, res) => {
    res.json(listModels());
  });

  app.get("/api/models/current", (_req, res) => {
    res.json({
      settings: getRuntimeSettings(),
      currentModel: getCurrentModelConfig()
    });
  });

  app.get("/api/models/current/stream", (req, res) => {
    const cleanup = registerRuntimeSettingsStream(res);

    req.on("close", () => {
      cleanup();
      res.end();
    });
  });

  app.post("/api/models", (req, res) => {
    res.status(201).json(createModel(req.body));
  });

  app.post("/api/models/current", async (req, res, next) => {
    try {
      res.json(await saveRuntimeSettings(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/models/current/detect", async (req, res, next) => {
    try {
      res.json(await detectCurrentModel(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/models/test", async (req, res, next) => {
    try {
      const useRuntime = req.body?.baseUrl || req.body?.apiKey;
      res.json(useRuntime ? await testRuntimeSettings(req.body) : testModelConnection(req.body));
    } catch (error) {
      next(error);
    }
  });
}
