import { createStudySetDocument, listStudySetDocuments, searchStudySetSources } from "../services/studySetResourceService.js";
import {
  defineObjectSchema,
  optionalNumberField,
  optionalStringField,
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

const studySetDocumentPayloadSchema = defineObjectSchema(
  {
    name: stringField("name", { maxLength: 255 }),
    sourceType: optionalStringField("sourceType", { maxLength: 60, defaultValue: "text" }),
    mimeType: optionalStringField("mimeType", { maxLength: 120, defaultValue: "text/plain" }),
    contentText: stringField("contentText", { maxLength: 500000 })
  },
  "study set document payload"
);

const sourceQuerySchema = defineObjectSchema(
  {
    query: optionalStringField("query", { maxLength: 1000, defaultValue: "" }),
    topK: optionalNumberField("topK", { integer: true, min: 1, max: 20, defaultValue: 5 })
  },
  "source query"
);

export function registerStudySetResourceRoutes(app) {
  app.get("/api/study-sets/:id/documents", validateParams(studySetIdParamsSchema), (req, res) => {
    res.json(listStudySetDocuments(req.validated.params.id));
  });

  app.post("/api/study-sets/:id/documents", validateParams(studySetIdParamsSchema), validateBody(studySetDocumentPayloadSchema), async (req, res, next) => {
    try {
      res.status(201).json(await createStudySetDocument(req.validated.params.id, req.validated.body));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/study-sets/:id/sources", validateParams(studySetIdParamsSchema), validateQuery(sourceQuerySchema), (req, res) => {
    res.json(searchStudySetSources(req.validated.params.id, req.validated.query));
  });
}
