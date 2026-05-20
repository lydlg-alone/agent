import { seedInitialData } from "../services/bootstrapService.js";
import { repairLegacyTextData } from "../services/legacyDataCleanupService.js";
import { registerAnalyticsRoutes } from "./analytics.js";
import { registerChatRoutes } from "./chat.js";
import { registerAgentRoutes } from "./agents.js";
import { registerDashboardRoutes } from "./dashboard.js";
import { registerHealthRoutes } from "./health.js";
import { registerKnowledgeRoutes } from "./knowledge.js";
import { registerModelRoutes } from "./models.js";
import { registerWorkflowRoutes } from "./workflows.js";

export function registerRoutes(app) {
  seedInitialData();
  repairLegacyTextData();
  registerHealthRoutes(app);
  registerDashboardRoutes(app);
  registerAnalyticsRoutes(app);
  registerModelRoutes(app);
  registerKnowledgeRoutes(app);
  registerAgentRoutes(app);
  registerWorkflowRoutes(app);
  registerChatRoutes(app);
}
