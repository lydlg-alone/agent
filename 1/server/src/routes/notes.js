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
}
