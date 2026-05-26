import {
  addDocument,
  clearKnowledgeDocuments,
  createKnowledgeBase,
  importKnowledgeDocuments,
  listKnowledgeBases,
  listKnowledgeDocuments,
  removeKnowledgeDocument,
  retrievalTest
} from "../services/knowledgeBaseService.js";
import {
  arrayField,
  defineObjectSchema,
  optionalNumberField,
  optionalStringField,
  stringField,
  validateBody,
  validateParams,
  validateQuery
} from "../utils/schemaValidation.js";

const idParamsSchema = defineObjectSchema(
  {
    id: stringField("知识库 ID", { maxLength: 80 })
  },
  "路由参数"
);

const documentIdParamsSchema = defineObjectSchema(
  {
    id: stringField("文档 ID", { maxLength: 80 })
  },
  "路由参数"
);

const knowledgeQuerySchema = defineObjectSchema(
  {
    search: optionalStringField("搜索关键词", { maxLength: 120, defaultValue: "" })
  },
  "查询参数"
);

const knowledgeBaseSchema = defineObjectSchema(
  {
    name: stringField("知识库名称", { maxLength: 120 }),
    category: optionalStringField("分类", { maxLength: 80, defaultValue: "通用" }),
    status: optionalStringField("状态", { maxLength: 40, defaultValue: "draft" }),
    vectorStore: optionalStringField("向量存储", {
      maxLength: 120,
      defaultValue: "SQLite + sqlite-vec"
    }),
    description: optionalStringField("描述", { maxLength: 1000, defaultValue: "" })
  },
  "创建知识库请求"
);

const importFileSchema = defineObjectSchema(
  {
    name: stringField("文件名称", { maxLength: 255 }),
    mimeType: optionalStringField("文件 MIME 类型", { maxLength: 120, defaultValue: "" }),
    sizeBytes: optionalNumberField("文件大小", {
      integer: true,
      min: 0,
      max: 200 * 1024 * 1024,
      defaultValue: 0
    }),
    contentText: optionalStringField("文件内容", {
      maxLength: 500000,
      defaultValue: ""
    })
  },
  "导入文件"
);

const importSchema = defineObjectSchema(
  {
    files: arrayField("files", (item) => importFileSchema(item), { maxLength: 100 })
  },
  "导入知识库请求"
);

const documentSchema = defineObjectSchema(
  {
    title: stringField("文档标题", { maxLength: 255 }),
    sourceType: optionalStringField("来源类型", { maxLength: 60, defaultValue: "markdown" }),
    chunkCount: optionalNumberField("切片数量", {
      integer: true,
      min: 1,
      max: 100000,
      defaultValue: 24
    }),
    sizeBytes: optionalNumberField("文档大小", {
      integer: true,
      min: 0,
      max: 200 * 1024 * 1024,
      defaultValue: 0
    }),
    summary: optionalStringField("文档摘要", { maxLength: 2000, defaultValue: "" })
  },
  "添加文档请求"
);

const retrievalSchema = defineObjectSchema(
  {
    query: stringField("检索问题", { maxLength: 1000 }),
    topK: optionalNumberField("返回条数", {
      integer: true,
      min: 1,
      max: 20,
      defaultValue: 3
    })
  },
  "检索测试请求"
);

export function registerKnowledgeRoutes(app) {
  app.get("/api/knowledge-bases", (_req, res) => {
    res.json(listKnowledgeBases());
  });

  app.get("/api/knowledge/documents", validateQuery(knowledgeQuerySchema), (req, res) => {
    res.json(listKnowledgeDocuments(req.validated.query.search));
  });

  app.post("/api/knowledge-bases", validateBody(knowledgeBaseSchema), (req, res) => {
    res.status(201).json(createKnowledgeBase(req.validated.body));
  });

  app.post("/api/knowledge/import", validateBody(importSchema), async (req, res, next) => {
    try {
      res.status(201).json(await importKnowledgeDocuments(req.validated.body.files));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/knowledge/documents/:id", validateParams(documentIdParamsSchema), (req, res) => {
    removeKnowledgeDocument(req.validated.params.id);
    res.status(204).end();
  });

  app.delete("/api/knowledge/documents", (_req, res) => {
    clearKnowledgeDocuments();
    res.status(204).end();
  });

  app.post("/api/knowledge-bases/:id/documents", validateParams(idParamsSchema), validateBody(documentSchema), (req, res) => {
    res.status(201).json(addDocument(req.validated.params.id, req.validated.body));
  });

  app.post("/api/knowledge-bases/:id/retrieval-test", validateParams(idParamsSchema), validateBody(retrievalSchema), (req, res) => {
    res.json(retrievalTest(req.validated.params.id, req.validated.body));
  });
}
