import { activateAgent, createAgent, getActiveAgent, listAgents } from "../services/agentService.js";

export function registerAgentRoutes(app) {
  app.get("/api/agents", (_req, res) => {
    res.json(listAgents());
  });

  app.get("/api/agents/active", (_req, res) => {
    res.json(getActiveAgent());
  });

  app.post("/api/agents", (req, res) => {
    res.status(201).json(createAgent(req.body));
  });

  app.post("/api/agents/:id/activate", (req, res) => {
    res.json(activateAgent(req.params.id));
  });
}
