import {
  clearSessionMessages,
  createSession,
  deleteSession,
  getSessionDetail,
  getWorkspaceState,
  renameSession,
  sendMessage,
  streamMessage,
  uploadAttachment
} from "../services/chatWorkspaceService.js";
import {
  defineObjectSchema,
  optionalNumberField,
  optionalStringField,
  stringArrayField,
  stringField,
  validateBody,
  validateParams
} from "../utils/schemaValidation.js";

const idParamsSchema = defineObjectSchema(
  {
    id: stringField("会话 ID", { maxLength: 80 })
  },
  "路由参数"
);

const sessionSchema = defineObjectSchema(
  {
    title: optionalStringField("会话标题", { maxLength: 120, defaultValue: "" })
  },
  "创建会话请求"
);

const renameSessionSchema = defineObjectSchema(
  {
    title: optionalStringField("会话标题", { maxLength: 120, defaultValue: "" })
  },
  "重命名会话请求"
);

const attachmentSchema = defineObjectSchema(
  {
    sessionId: optionalStringField("会话 ID", { maxLength: 80, defaultValue: "" }),
    name: stringField("附件名称", { maxLength: 255 }),
    mimeType: optionalStringField("附件 MIME 类型", { maxLength: 120, defaultValue: "" }),
    sizeBytes: optionalNumberField("附件大小", {
      min: 0,
      max: 50 * 1024 * 1024,
      defaultValue: 0
    }),
    contentText: optionalStringField("附件内容", {
      maxLength: 15 * 1024 * 1024,
      defaultValue: ""
    })
  },
  "上传附件请求"
);

const messageSchema = defineObjectSchema(
  {
    sessionId: optionalStringField("会话 ID", { maxLength: 80, defaultValue: "" }),
    content: optionalStringField("消息内容", { maxLength: 20000, defaultValue: "" }),
    attachmentIds: stringArrayField("附件 ID 列表", {
      maxLength: 50,
      itemMaxLength: 80
    })
  },
  "发送消息请求"
);

function validateMessagePayload(payload) {
  if (!payload.content && payload.attachmentIds.length === 0) {
    const error = new Error("消息内容和附件不能同时为空。");
    error.statusCode = 400;
    throw error;
  }

  return payload;
}

function writeSseEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function registerChatRoutes(app) {
  app.get("/api/chat/workspace", (_req, res) => {
    res.json(getWorkspaceState());
  });

  app.post("/api/chat/sessions", validateBody(sessionSchema), (req, res) => {
    res.status(201).json(createSession(req.validated.body));
  });

  app.get("/api/chat/sessions/:id", validateParams(idParamsSchema), (req, res) => {
    res.json(getSessionDetail(req.validated.params.id));
  });

  app.patch("/api/chat/sessions/:id", validateParams(idParamsSchema), validateBody(renameSessionSchema), (req, res) => {
    res.json(renameSession(req.validated.params.id, req.validated.body.title));
  });

  app.delete("/api/chat/sessions/:id", validateParams(idParamsSchema), (req, res) => {
    res.json(deleteSession(req.validated.params.id));
  });

  app.post("/api/chat/sessions/:id/clear", validateParams(idParamsSchema), (req, res) => {
    res.json(clearSessionMessages(req.validated.params.id));
  });

  app.post("/api/chat/attachments", validateBody(attachmentSchema), async (req, res, next) => {
    try {
      res.status(201).json(await uploadAttachment(req.validated.body));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chat/messages", validateBody(messageSchema), async (req, res, next) => {
    try {
      res.status(201).json(await sendMessage(validateMessagePayload(req.validated.body)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chat/messages/stream", validateBody(messageSchema), async (req, res, next) => {
    const payload = validateMessagePayload(req.validated.body);
    let closed = false;

    res.on("close", () => {
      closed = true;
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
      await streamMessage(payload, {
        onStart(data) {
          if (!closed) {
            writeSseEvent(res, { type: "start", ...data });
          }
        },
        onDelta(data) {
          if (!closed) {
            writeSseEvent(res, { type: "delta", ...data });
          }
        },
        onDone(data) {
          if (!closed) {
            writeSseEvent(res, { type: "done", ...data });
          }
        }
      });
    } catch (error) {
      if (!closed) {
        writeSseEvent(res, {
          type: "error",
          message: error.message || "流式输出失败。"
        });
      }

      if (!res.headersSent) {
        next(error);
        return;
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  });
}
