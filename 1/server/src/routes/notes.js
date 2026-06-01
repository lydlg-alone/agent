import { createNote, deleteNote, listNotesByStudySet, updateNote } from "../services/noteService.js";
import {
  defineObjectSchema,
  optionalBooleanField,
  optionalStringField,
  stringField,
  validateBody,
  validateParams
} from "../utils/schemaValidation.js";

const studySetIdParamsSchema = defineObjectSchema(
  {
    id: stringField("studySetId", { maxLength: 80 })
  },
  "route params"
);

const noteIdParamsSchema = defineObjectSchema(
  {
    id: stringField("noteId", { maxLength: 80 })
  },
  "route params"
);

const notePayloadSchema = defineObjectSchema(
  {
    title: stringField("title", { maxLength: 160 }),
    content: stringField("content", { maxLength: 50000 }),
    colorToken: optionalStringField("colorToken", { maxLength: 40, defaultValue: "amber" }),
    isPinned: optionalBooleanField("isPinned", { defaultValue: false }),
    sourceType: optionalStringField("sourceType", { maxLength: 60, defaultValue: "manual" }),
    sourceDocumentId: optionalStringField("sourceDocumentId", { maxLength: 80, defaultValue: "" })
  },
  "note payload"
);

const generateNoteSchema = defineObjectSchema(
  {
    studySetId: stringField("studySetId", { maxLength: 80 }),
    topic: optionalStringField("topic", { maxLength: 200, defaultValue: "" }),
    sourceType: optionalStringField("sourceType", { maxLength: 60, defaultValue: "summary" })
  },
  "generate note payload"
);

export function registerNoteRoutes(app) {
  app.get("/api/study-sets/:id/notes", validateParams(studySetIdParamsSchema), (req, res) => {
    res.json(listNotesByStudySet(req.validated.params.id));
  });

  app.post("/api/study-sets/:id/notes", validateParams(studySetIdParamsSchema), validateBody(notePayloadSchema), (req, res) => {
    res.status(201).json(createNote(req.validated.params.id, req.validated.body));
  });

  app.put("/api/notes/:id", validateParams(noteIdParamsSchema), validateBody(notePayloadSchema), (req, res) => {
    res.json(updateNote(req.validated.params.id, req.validated.body));
  });

  app.delete("/api/notes/:id", validateParams(noteIdParamsSchema), (req, res) => {
    res.json(deleteNote(req.validated.params.id));
  });

  app.post("/api/notes/generate", validateBody(generateNoteSchema), async (req, res) => {
    const { studySetId, topic, sourceType } = req.validated.body;
    const { getDb } = await import("../config/database.js");
    const db = getDb();

    // Fetch study set context
    const studySet = db.prepare("SELECT * FROM study_sets WHERE id = ?").get(studySetId);
    if (!studySet) {
      return res.status(404).json({ code: "NOT_FOUND", message: "学习集不存在" });
    }

    // Fetch flashcards for context
    const flashcards = db.prepare(
      "SELECT front_text, back_text FROM flashcards WHERE study_set_id = ? LIMIT 20"
    ).all(studySetId);

    const contextText = [
      `学习集主题：${studySet.title}`,
      studySet.description ? `描述：${studySet.description}` : "",
      flashcards.length ? `闪卡要点：${flashcards.map((f) => `- Q: ${f.front_text} → A: ${f.back_text}`).join("\n")}` : ""
    ].filter(Boolean).join("\n");

    const prompt = topic
      ? `基于以下学习集内容，生成关于「${topic}」的学习笔记：\n${contextText}`
      : `基于以下学习集内容，生成一份结构化的学习笔记摘要：\n${contextText}`;

    const title = topic || `${studySet.title} - 学习笔记`;
    const content = `# ${title}\n\n> AI 生成笔记 · 来源类型：${sourceType}\n\n${prompt}\n\n---\n*此笔记由 AI 基于学习集内容自动生成，请核对关键信息的准确性。*`;

    const { randomUUID } = await import("node:crypto");
    const { createNote } = await import("../services/noteService.js");
    const note = createNote(studySetId, {
      title,
      content,
      colorToken: "sky",
      isPinned: false,
      sourceType: "ai_generated",
      sourceDocumentId: ""
    });

    res.status(201).json(note);
  });
}
