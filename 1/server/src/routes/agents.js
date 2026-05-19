import { activateAgent, createAgent, getActiveAgent, listAgents } from "../services/agentService.js";
import {
  defineObjectSchema,
  optionalStringField,
  stringField,
  validateBody,
  validateParams
} from "../utils/schemaValidation.js";

const idParamsSchema = defineObjectSchema(
  {
    id: stringField("智能体 ID", { maxLength: 80 })
  },
  "路由参数"
);

const createAgentSchema = defineObjectSchema(
  {
    name: stringField("智能体名称", { maxLength: 120 }),
    role: stringField("智能体角色", { maxLength: 80 }),
    modelBinding: optionalStringField("模型绑定", { maxLength: 120, defaultValue: "" }),
    promptTemplate: optionalStringField("提示词模板", { maxLength: 12000, defaultValue: "" }),
    knowledgeScope: optionalStringField("知识范围", { maxLength: 1000, defaultValue: "" })
  },
  "创建智能体请求"
);

export function registerAgentRoutes(app) {
  app.get("/api/agents", (_req, res) => {
    res.json(listAgents());
  });

  app.get("/api/agents/active", (_req, res) => {
    res.json(getActiveAgent());
  });

  app.post("/api/agents", validateBody(createAgentSchema), (req, res) => {
    res.status(201).json(createAgent(req.validated.body));
  });

  app.post("/api/agents/:id/activate", validateParams(idParamsSchema), (req, res) => {
    res.json(activateAgent(req.validated.params.id));
  });
}
