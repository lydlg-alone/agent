import {
  diagnose,
  evaluateAnswer,
  generatePractice,
  generateResource,
  plan
} from "../services/learningWorkflowService.js";

export function registerWorkflowRoutes(app) {
  app.post("/api/workflows/diagnose", (req, res) => {
    res.json(diagnose(req.body));
  });

  app.post("/api/workflows/plan", (req, res) => {
    res.json(plan(req.body));
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
