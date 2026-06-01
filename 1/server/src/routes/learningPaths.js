import { getDb } from "../config/database.js";

function selectPlanFields() {
  return `
    SELECT lp.*,
           ss.title AS study_set_title
    FROM learning_plans lp
    LEFT JOIN study_sets ss ON ss.id = lp.study_set_id
  `;
}

function mapPlan(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    studySetId: row.study_set_id || "",
    studySetTitle: row.study_set_title || ""
  };
}

export function registerLearningPathRoutes(app) {
  app.get("/api/learning-plans", (_req, res) => {
    const db = getDb();
    const plans = db
      .prepare(`${selectPlanFields()} ORDER BY datetime(lp.created_at) DESC`)
      .all()
      .map(mapPlan);
    res.json(plans);
  });

  app.get("/api/learning-plans/:id", (req, res) => {
    const db = getDb();
    const plan = mapPlan(
      db.prepare(`${selectPlanFields()} WHERE lp.id = ?`).get(req.params.id)
    );

    if (!plan) {
      return res.status(404).json({ code: "NOT_FOUND", message: "学习计划不存在" });
    }

    res.json(plan);
  });

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
      db.prepare("UPDATE learning_plans SET difficulty = ? WHERE id = ?").run(difficulty, req.params.id);
    }

    const plan = mapPlan(db.prepare(`${selectPlanFields()} WHERE lp.id = ?`).get(req.params.id));
    res.json(plan);
  });

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
