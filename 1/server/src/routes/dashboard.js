import { getDashboardSummary } from "../services/dashboardService.js";

export function registerDashboardRoutes(app) {
  app.get("/api/dashboard/summary", (_req, res) => {
    res.json(getDashboardSummary());
  });
}
