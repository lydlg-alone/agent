import { getDb } from "../config/database.js";

export function registerLearningPathRoutes(app) {
  // GET /api/learning-plans — list all
  app.get("/api/learning-plans", (_req, res) => {
    const db = getDb();
    const plans = db.prepare(
      "SELECT * FROM learning_plans ORDER BY created_at DESC"
    ).all();
    res.json(plans);
  });

  // GET /api/learning-plans/:id — detail
  app.get("/api/learning-plans/:id", (req, res) => {
    const db = getDb();
    const plan = db.prepare("SELECT * FROM learning_plans WHERE id = ?").get(req.params.id);
    if (!plan) {
      return res.status(404).json({ code: "NOT_FOUND", message: "学习计划不存在" });
    }
    res.json(plan);
  });

  // PATCH /api/learning-plans/:id — update progress
  app.patch("/api/learning-plans/:id", (req, res) => {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM learning_plans WHERE id = ?").get(req.params.id);
    if (!existing) {
      return res.status(404).json({ code: "NOT_FOUND", message: "学习计划不存在" });
    }

    const { stages_json, difficulty } = req.body || {};
    if (stages_json) {
      db.prepare("UPDATE learning_plans SET stages_json = ? WHERE id = ?")
        .run(typeof stages_json === "string" ? stages_json : JSON.stringify(stages_json), req.params.id);
    }
    if (difficulty) {
      db.prepare("UPDATE learning_plans SET difficulty = ? WHERE id = ?")
        .run(difficulty, req.params.id);
    }

    const plan = db.prepare("SELECT * FROM learning_plans WHERE id = ?").get(req.params.id);
    res.json(plan);
  });

  // DELETE /api/learning-plans/:id
  app.delete("/api/learning-plans/:id", (req, res) => {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM learning_plans WHERE id = ?").get(req.params.id);
    if (!existing) {
      return res.status(404).json({ code: "NOT_FOUND", message: "学习计划不存在" });
    }
    db.prepare("DELETE FROM learning_plans WHERE id = ?").run(req.params.id);
    res.json({ message: "学习计划已删除" });
  });
}
