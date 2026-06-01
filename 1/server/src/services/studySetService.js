import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";

function mapStudySet(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    tags: JSON.parse(row.tags_json || "[]"),
    isPublic: Boolean(row.is_public),
    examDate: row.exam_date || "",
    examSubject: row.exam_subject || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertStudySetExists(id) {
  const db = getDb();
  const found = db.prepare("SELECT 1 FROM study_sets WHERE id = ?").get(id);
  if (!found) {
    const error = new Error("学习集不存在");
    error.statusCode = 404;
    throw error;
  }
}

export function listStudySets(options = {}) {
  const db = getDb();
  const search = String(options.search || "").trim().toLowerCase();

  const rows = db
    .prepare(
      `SELECT *
       FROM study_sets
       ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`
    )
    .all();

  if (!search) {
    return rows.map(mapStudySet);
  }

  return rows
    .map(mapStudySet)
    .filter((item) => {
      const haystacks = [item.title, item.description, item.examSubject, ...(item.tags || [])]
        .join(" ")
        .toLowerCase();
      return haystacks.includes(search);
    });
}

export function getStudySetById(id) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM study_sets WHERE id = ?").get(id);
  if (!row) {
    const error = new Error("学习集不存在");
    error.statusCode = 404;
    throw error;
  }
  return mapStudySet(row);
}

export function createStudySet(payload) {
  const db = getDb();
  const now = new Date().toISOString();
  const row = {
    id: createId("studyset"),
    title: payload.title,
    description: payload.description || "",
    tags_json: JSON.stringify(payload.tags || []),
    is_public: payload.isPublic ? 1 : 0,
    exam_date: payload.examDate || "",
    exam_subject: payload.examSubject || "",
    created_at: now,
    updated_at: now
  };

  db.prepare(
    `INSERT INTO study_sets (
      id, title, description, tags_json, is_public, exam_date, exam_subject, created_at, updated_at
    ) VALUES (
      @id, @title, @description, @tags_json, @is_public, @exam_date, @exam_subject, @created_at, @updated_at
    )`
  ).run(row);

  return mapStudySet(row);
}

export function updateStudySet(id, payload) {
  assertStudySetExists(id);
  const db = getDb();
  const existing = getStudySetById(id);
  const next = {
    ...existing,
    title: payload.title,
    description: payload.description || "",
    tags: payload.tags || [],
    isPublic: payload.isPublic,
    examDate: payload.examDate || "",
    examSubject: payload.examSubject || "",
    updatedAt: new Date().toISOString()
  };

  db.prepare(
    `UPDATE study_sets
     SET title = @title,
         description = @description,
         tags_json = @tags_json,
         is_public = @is_public,
         exam_date = @exam_date,
         exam_subject = @exam_subject,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id,
    title: next.title,
    description: next.description,
    tags_json: JSON.stringify(next.tags),
    is_public: next.isPublic ? 1 : 0,
    exam_date: next.examDate,
    exam_subject: next.examSubject,
    updated_at: next.updatedAt
  });

  return getStudySetById(id);
}

export function deleteStudySet(id) {
  assertStudySetExists(id);
  const db = getDb();
  db.prepare("DELETE FROM study_sets WHERE id = ?").run(id);
  return { id };
}
