import { listKnowledgeDocuments, importKnowledgeDocuments } from "./knowledgeBaseService.js";
import { listNotesByStudySet } from "./noteService.js";
import { searchChunks } from "./ragService.js";
import { getDb } from "../config/database.js";

function assertStudySetExists(studySetId) {
  const db = getDb();
  const row = db.prepare("SELECT id, title, description FROM study_sets WHERE id = ?").get(studySetId);
  if (!row) {
    const error = new Error("Study set not found.");
    error.statusCode = 404;
    throw error;
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description || ""
  };
}

export function listStudySetDocuments(studySetId) {
  assertStudySetExists(studySetId);
  return listKnowledgeDocuments("", { studySetId });
}

export async function createStudySetDocument(studySetId, payload) {
  assertStudySetExists(studySetId);
  const docs = await importKnowledgeDocuments(
    [
      {
        name: payload.name,
        sourceType: payload.sourceType || "text",
        mimeType: payload.mimeType || "text/plain",
        sizeBytes: payload.sizeBytes || payload.contentText.length,
        contentText: payload.contentText
      }
    ],
    { studySetId }
  );

  return docs[0] || null;
}

export function searchStudySetSourceChunks(studySetId, query, topK = 5) {
  const documents = listKnowledgeDocuments("", { studySetId });
  const notes = listNotesByStudySet(studySetId);
  const allowedDocumentIds = new Set(documents.map((item) => item.id));
  const allowedNoteIds = new Set(notes.map((item) => item.id));

  return searchChunks(query, { topK: topK * 10 })
    .filter((item) => {
      if (item.sourceType === "knowledge_document") {
        return allowedDocumentIds.has(item.sourceId);
      }
      if (item.sourceType === "study_note") {
        return allowedNoteIds.has(item.sourceId);
      }
      return false;
    })
    .slice(0, topK);
}

export function searchStudySetSources(studySetId, options = {}) {
  const studySet = assertStudySetExists(studySetId);
  const documents = listKnowledgeDocuments("", { studySetId });
  const notes = listNotesByStudySet(studySetId);
  const query = String(options.query || "").trim();
  const topK = Math.max(1, Math.min(20, Number(options.topK || 5)));

  if (!query) {
    return {
      studySet,
      documents,
      notes,
      chunks: []
    };
  }

  const chunks = searchStudySetSourceChunks(studySetId, query, topK);

  return {
    studySet,
    documents,
    notes,
    chunks
  };
}
