import {
  clearSessionMessages,
  createSession,
  getSessionDetail,
  getWorkspaceState,
  sendMessage,
  uploadAttachment
} from "../services/chatWorkspaceService.js";

export function registerChatRoutes(app) {
  app.get("/api/chat/workspace", (_req, res) => {
    res.json(getWorkspaceState());
  });

  app.post("/api/chat/sessions", (req, res) => {
    res.status(201).json(createSession(req.body));
  });

  app.get("/api/chat/sessions/:id", (req, res) => {
    res.json(getSessionDetail(req.params.id));
  });

  app.post("/api/chat/sessions/:id/clear", (req, res) => {
    res.json(clearSessionMessages(req.params.id));
  });

  app.post("/api/chat/attachments", (req, res) => {
    res.status(201).json(uploadAttachment(req.body));
  });

  app.post("/api/chat/messages", async (req, res, next) => {
    try {
      res.status(201).json(await sendMessage(req.body));
    } catch (error) {
      next(error);
    }
  });
}
