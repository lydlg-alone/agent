import { seedInitialData } from "../services/bootstrapService.js";
import { repairLegacyTextData } from "../services/legacyDataCleanupService.js";
import { registerAnalyticsRoutes } from "./analytics.js";
import { registerFlashcardRoutes } from "./flashcards.js";
import { registerChatRoutes } from "./chat.js";
import { registerAgentRoutes } from "./agents.js";
import { registerDashboardRoutes } from "./dashboard.js";
import { registerHealthRoutes } from "./health.js";
import { registerKnowledgeRoutes } from "./knowledge.js";
import { registerLearningPathRoutes } from "./learningPaths.js";
import { registerModelRoutes } from "./models.js";
import { registerNoteRoutes } from "./notes.js";
import { registerQuizRoutes } from "./quizzes.js";
import { registerStudySetResourceRoutes } from "./studySetResources.js";
import { registerStudySetRoutes } from "./studySets.js";
import { registerUserRoutes } from "./users.js";
import { registerWorkflowRoutes } from "./workflows.js";

export function registerRoutes(app) {
  seedInitialData();
  repairLegacyTextData();
  registerHealthRoutes(app);
  registerDashboardRoutes(app);
  registerAnalyticsRoutes(app);
  registerUserRoutes(app);
  registerStudySetRoutes(app);
  registerStudySetResourceRoutes(app);
  registerFlashcardRoutes(app);
  registerQuizRoutes(app);
  registerNoteRoutes(app);
  registerLearningPathRoutes(app);
  registerModelRoutes(app);
  registerKnowledgeRoutes(app);
  registerAgentRoutes(app);
  registerWorkflowRoutes(app);
  registerChatRoutes(app);
}
