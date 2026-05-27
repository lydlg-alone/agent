import {
  createFlashcard,
  deleteFlashcard,
  listDueFlashcards,
  listFlashcardsByStudySet,
  reviewFlashcard,
  updateFlashcard
} from "../services/flashcardService.js";
import {
  defineObjectSchema,
  optionalNumberField,
  optionalObjectField,
  optionalStringField,
  stringArrayField,
  stringField,
  validateBody,
  validateParams,
  validateQuery
} from "../utils/schemaValidation.js";

const studySetIdParamsSchema = defineObjectSchema(
  {
    id: stringField("studySetId", { maxLength: 80 })
  },
  "route params"
);

const flashcardIdParamsSchema = defineObjectSchema(
  {
    id: stringField("flashcardId", { maxLength: 80 })
  },
  "route params"
);

const listStudySetFlashcardsQuerySchema = defineObjectSchema(
  {
    dueOnly: optionalStringField("dueOnly", { maxLength: 10, defaultValue: "" }),
    status: optionalStringField("status", { maxLength: 30, defaultValue: "" }),
    tag: optionalStringField("tag", { maxLength: 40, defaultValue: "" }),
    limit: optionalNumberField("limit", { integer: true, min: 1, max: 500, defaultValue: 0 })
  },
  "query params"
);

const listDueFlashcardsQuerySchema = defineObjectSchema(
  {
    limit: optionalNumberField("limit", { integer: true, min: 1, max: 500, defaultValue: 100 })
  },
  "query params"
);

const flashcardPayloadSchema = defineObjectSchema(
  {
    cardType: optionalStringField("cardType", { maxLength: 40, defaultValue: "standard" }),
    frontText: optionalStringField("frontText", { maxLength: 20000, defaultValue: "" }),
    backText: optionalStringField("backText", { maxLength: 20000, defaultValue: "" }),
    extraData: optionalObjectField("extraData", { defaultValue: {} }),
    tags: stringArrayField("tags", { maxLength: 30, itemMaxLength: 40 })
  },
  "flashcard payload"
);

const reviewPayloadSchema = defineObjectSchema(
  {
    quality: optionalNumberField("quality", {
      integer: true,
      min: 1,
      max: 5,
      defaultValue: 3
    })
  },
  "review payload"
);

export function registerFlashcardRoutes(app) {
  app.get("/api/study-sets/:id/flashcards", validateParams(studySetIdParamsSchema), validateQuery(listStudySetFlashcardsQuerySchema), (req, res) => {
    res.json(listFlashcardsByStudySet(req.validated.params.id, req.validated.query));
  });

  app.post("/api/study-sets/:id/flashcards", validateParams(studySetIdParamsSchema), validateBody(flashcardPayloadSchema), (req, res) => {
    res.status(201).json(createFlashcard(req.validated.params.id, req.validated.body));
  });

  app.put("/api/flashcards/:id", validateParams(flashcardIdParamsSchema), validateBody(flashcardPayloadSchema), (req, res) => {
    res.json(updateFlashcard(req.validated.params.id, req.validated.body));
  });

  app.delete("/api/flashcards/:id", validateParams(flashcardIdParamsSchema), (req, res) => {
    res.json(deleteFlashcard(req.validated.params.id));
  });

  app.post("/api/flashcards/:id/review", validateParams(flashcardIdParamsSchema), validateBody(reviewPayloadSchema), (req, res) => {
    res.json(reviewFlashcard(req.validated.params.id, req.validated.body));
  });

  app.get("/api/flashcards/due", validateQuery(listDueFlashcardsQuerySchema), (req, res) => {
    res.json(listDueFlashcards(req.validated.query));
  });
}
