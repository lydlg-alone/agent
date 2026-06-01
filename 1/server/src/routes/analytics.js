import { getOverviewStats } from "../services/analyticsService.js";

export function registerAnalyticsRoutes(app) {
  app.get("/api/analytics/overview", (_req, res) => {
    try {
      const data = getOverviewStats();
      res.json(data);
    } catch (error) {
      console.error("Analytics overview failed:", error.message);
      res.status(500).json({ message: "获取统计数据失败" });
    }
  });
}
