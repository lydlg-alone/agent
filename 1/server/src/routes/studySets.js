import {
  createStudySet,
  deleteStudySet,
  getStudySetById,
  listStudySets,
  updateStudySet
} from "../services/studySetService.js";
import {
  defineObjectSchema,
  optionalBooleanField,
  optionalStringField,
  stringArrayField,
  stringField,
  validateBody,
  validateParams,
  validateQuery
} from "../utils/schemaValidation.js";

const idParamsSchema = defineObjectSchema(
  {
    id: stringField("学习集 ID", { maxLength: 80 })
  },
  "路由参数"
);

const listQuerySchema = defineObjectSchema(
  {
    search: optionalStringField("搜索关键词", { maxLength: 120, defaultValue: "" })
  },
  "查询参数"
);

const studySetPayloadSchema = defineObjectSchema(
  {
    title: stringField("学习集标题", { maxLength: 120 }),
    description: optionalStringField("描述", { maxLength: 4000, defaultValue: "" }),
    tags: stringArrayField("标签", { maxLength: 30, itemMaxLength: 40 }),
    isPublic: optionalBooleanField("是否公开", { defaultValue: false }),
    examDate: optionalStringField("考试日期", { maxLength: 30, defaultValue: "" }),
    examSubject: optionalStringField("考试科目", { maxLength: 120, defaultValue: "" })
  },
  "学习集请求"
);

export function registerStudySetRoutes(app) {
  app.get("/api/study-sets", validateQuery(listQuerySchema), (req, res) => {
    res.json(listStudySets(req.validated.query));
  });

  app.post("/api/study-sets", validateBody(studySetPayloadSchema), (req, res) => {
    res.status(201).json(createStudySet(req.validated.body));
  });

  app.get("/api/study-sets/:id", validateParams(idParamsSchema), (req, res) => {
    res.json(getStudySetById(req.validated.params.id));
  });

  app.put("/api/study-sets/:id", validateParams(idParamsSchema), validateBody(studySetPayloadSchema), (req, res) => {
    res.json(updateStudySet(req.validated.params.id, req.validated.body));
  });

  app.delete("/api/study-sets/:id", validateParams(idParamsSchema), (req, res) => {
    res.json(deleteStudySet(req.validated.params.id));
  });
}
