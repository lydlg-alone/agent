import cors from "cors";
import express from "express";
import { bootstrapDatabase } from "./config/database.js";
import { registerRoutes } from "./routes/index.js";

export function createApp() {
  bootstrapDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_req, res) => {
    res.json({
      name: "AI Learning Desktop API",
      status: "ok"
    });
  });

  registerRoutes(app);

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.statusCode || 500).json({
      code: "INTERNAL_ERROR",
      message: error.message || "Server error"
    });
  });

  return app;
}
