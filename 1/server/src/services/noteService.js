import { getDb } from "../config/database.js";
import { createId } from "../utils/id.js";
import { chunkText } from "./chunkingService.js";
import { indexChunks, removeChunks } from "./ragService.js";

function nowIso() {
  return new Date().toISOString();
}

function assertStudySetExists(studySetId) {
  const db = getDb();
  const row = db.prepare("SELECT id FROM study_sets WHERE id = ?").get(studySetId);
  if (!row) {
    const error = new Error("Study set not found.");
    error.statusCode = 404;
    throw error;
  }
}

function getNoteRowById(noteId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT n.*, d.name AS source_document_name
       FROM notes n
       LEFT JOIN knowledge_documents d ON d.id = n.source_document_id
       WHERE n.id = ?`
    )
    .get(noteId);

  if (!row) {
    const error = new Error("Note not found.");
    error.statusCode = 404;
    throw error;
  }

  return row;
}

function mapNote(row) {
  return {
    id: row.id,
    studySetId: row.study_set_id,
    title: row.title,
    content: row.content,
    colorToken: row.color_token,
    isPinned: Boolean(row.is_pinned),
    sourceType: row.source_type,
    sourceDocumentId: row.source_document_id || "",
    sourceDocumentName: row.source_document_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function indexNoteContent(note) {
  const chunks = chunkText(note.content || "");
  if (!chunks.length) {
    removeChunks("study_note", note.id);
    return;
  }

  indexChunks("study_note", note.id, note.title, chunks);
}

export function listNotesByStudySet(studySetId) {
  assertStudySetExists(studySetId);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT n.*, d.name AS source_document_name
       FROM notes n
       LEFT JOIN knowledge_documents d ON d.id = n.source_document_id
       WHERE n.study_set_id = ?
       ORDER BY n.is_pinned DESC, datetime(n.updated_at) DESC, datetime(n.created_at) DESC`
    )
    .all(studySetId);

  return rows.map(mapNote);
}

export function createNote(studySetId, payload) {
  assertStudySetExists(studySetId);
  const db = getDb();
  const now = nowIso();
  const row = {
    id: createId("note"),
    study_set_id: studySetId,
    title: payload.title,
    content: payload.content,
    color_token: payload.colorToken || "amber",
    is_pinned: payload.isPinned ? 1 : 0,
    source_type: payload.sourceType || "manual",
    source_document_id: payload.sourceDocumentId || null,
    created_at: now,
    updated_at: now
  };

  db.prepare(
    `INSERT INTO notes (
      id, study_set_id, title, content, color_token, is_pinned, source_type, source_document_id, created_at, updated_at
    ) VALUES (
      @id, @study_set_id, @title, @content, @color_token, @is_pinned, @source_type, @source_document_id, @created_at, @updated_at
    )`
  ).run(row);

  indexNoteContent({
    id: row.id,
    title: row.title,
    content: row.content
  });

  return mapNote(getNoteRowById(row.id));
}

export function updateNote(noteId, payload) {
  const db = getDb();
  const existing = getNoteRowById(noteId);
  const next = {
    ...existing,
    title: payload.title,
    content: payload.content,
    color_token: payload.colorToken || "amber",
    is_pinned: payload.isPinned ? 1 : 0,
    source_type: payload.sourceType || "manual",
    source_document_id: payload.sourceDocumentId || null,
    updated_at: nowIso()
  };

  db.prepare(
    `UPDATE notes
     SET title = @title,
         content = @content,
         color_token = @color_token,
         is_pinned = @is_pinned,
         source_type = @source_type,
         source_document_id = @source_document_id,
         updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id: noteId,
    title: next.title,
    content: next.content,
    color_token: next.color_token,
    is_pinned: next.is_pinned,
    source_type: next.source_type,
    source_document_id: next.source_document_id,
    updated_at: next.updated_at
  });

  indexNoteContent({
    id: noteId,
    title: next.title,
    content: next.content
  });

  return mapNote(getNoteRowById(noteId));
}

export function deleteNote(noteId) {
  const db = getDb();
  getNoteRowById(noteId);
  removeChunks("study_note", noteId);
  db.prepare("DELETE FROM notes WHERE id = ?").run(noteId);
  return { id: noteId };
}
