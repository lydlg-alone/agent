import { randomUUID } from "node:crypto";
import { getDb } from "../config/database.js";

/**
 * POST /api/users/register
 * body: { name, current_goal?, preference?, level? }
 */
function register(req, res) {
  const { name, current_goal, preference, level } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ code: "INVALID_NAME", message: "名称不能为空" });
  }

  const trimmed = name.trim();
  const db = getDb();

  const existing = db.prepare("SELECT * FROM users WHERE name = ?").get(trimmed);
  if (existing) {
    return res.status(409).json({ code: "USER_EXISTS", message: "该名称已被使用，请直接登录", user: existing });
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO users (id, name, current_goal, preference, level, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, trimmed, current_goal || null, preference || null, level || null, createdAt);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return res.status(201).json({ user });
}

/**
 * POST /api/users/login
 * body: { name }
 * If user exists → return user; otherwise → auto-create and return
 */
function login(req, res) {
  const { name } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ code: "INVALID_NAME", message: "请输入名称" });
  }

  const trimmed = name.trim();
  const db = getDb();

  let user = db.prepare("SELECT * FROM users WHERE name = ?").get(trimmed);
  if (!user) {
    // Auto-register for desktop simplicity
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO users (id, name, current_goal, preference, level, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, trimmed, null, null, null, createdAt);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }

  return res.json({ user });
}

/**
 * GET /api/users
 * List all users (for the login picker)
 */
function listUsers(_req, res) {
  const db = getDb();
  const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  return res.json({ users });
}

/**
 * GET /api/users/:id
 */
function getUser(req, res) {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) {
    return res.status(404).json({ code: "NOT_FOUND", message: "用户不存在" });
  }
  return res.json({ user });
}

/**
 * PATCH /api/users/:id
 * body: { name?, current_goal?, preference?, level? }
 */
function updateUser(req, res) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: "NOT_FOUND", message: "用户不存在" });
  }

  const { name, current_goal, preference, level } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (current_goal !== undefined) updates.current_goal = current_goal;
  if (preference !== undefined) updates.preference = preference;
  if (level !== undefined) updates.level = level;

  if (Object.keys(updates).length === 0) {
    return res.json({ user: existing });
  }

  const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(updates);
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...values, req.params.id);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  return res.json({ user });
}

export function registerUserRoutes(app) {
  app.post("/api/users/register", register);
  app.post("/api/users/login", login);
  app.get("/api/users", listUsers);
  app.get("/api/users/:id", getUser);
  app.patch("/api/users/:id", updateUser);
}
