import {
  diagnose,
  evaluateAnswer,
  generatePractice,
  generateResource,
  plan
} from "../services/learningWorkflowService.js";
import {
  defineObjectSchema,
  optionalStringField,
  stringField,
  validateBody
} from "../utils/schemaValidation.js";

const planPayloadSchema = defineObjectSchema(
  {
    goal: stringField("学习目标", { maxLength: 200 }),
    difficulty: optionalStringField("难度", { maxLength: 40, defaultValue: "intermediate" }),
    studySetId: optionalStringField("学习集 ID", { maxLength: 80, defaultValue: "" }),
    userId: optionalStringField("用户 ID", { maxLength: 80, defaultValue: "" })
  },
  "学习路径生成请求"
);

export function registerWorkflowRoutes(app) {
  app.post("/api/workflows/diagnose", (req, res) => {
    res.json(diagnose(req.body));
  });

  app.post("/api/workflows/plan", validateBody(planPayloadSchema), async (req, res, next) => {
    try {
      res.json(await plan(req.validated.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/workflows/resources", (req, res) => {
    res.status(201).json(generateResource(req.body));
  });

  app.post("/api/workflows/practice", (req, res) => {
    res.status(201).json(generatePractice(req.body));
  });

  app.post("/api/workflows/feedback", (req, res) => {
    res.status(201).json(evaluateAnswer(req.body));
  });
}
