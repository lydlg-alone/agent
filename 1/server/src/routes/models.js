import { createModel, getCurrentModelConfig, listModels, testModelConnection } from "../services/modelConfigService.js";
import {
  detectCurrentModel,
  getRuntimeSettings,
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

  app.post("/api/models", (req, res) => {
    res.status(201).json(createModel(req.body));
  });

  app.post("/api/models/current", (req, res) => {
    res.json(saveRuntimeSettings(req.body));
  });

  app.post("/api/models/current/detect", (req, res) => {
    res.json(detectCurrentModel(req.body));
  });

  app.post("/api/models/test", (req, res) => {
    const useRuntime = req.body?.baseUrl || req.body?.apiKey;
    res.json(useRuntime ? testRuntimeSettings(req.body) : testModelConnection(req.body));
  });
}
