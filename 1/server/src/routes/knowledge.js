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

export function registerKnowledgeRoutes(app) {
  app.get("/api/knowledge-bases", (_req, res) => {
    res.json(listKnowledgeBases());
  });

  app.get("/api/knowledge/documents", (req, res) => {
    res.json(listKnowledgeDocuments(req.query.search));
  });

  app.post("/api/knowledge-bases", (req, res) => {
    res.status(201).json(createKnowledgeBase(req.body));
  });

  app.post("/api/knowledge/import", (req, res) => {
    res.status(201).json(importKnowledgeDocuments(req.body.files || []));
  });

  app.delete("/api/knowledge/documents/:id", (req, res) => {
    removeKnowledgeDocument(req.params.id);
    res.status(204).end();
  });

  app.delete("/api/knowledge/documents", (_req, res) => {
    clearKnowledgeDocuments();
    res.status(204).end();
  });

  app.post("/api/knowledge-bases/:id/documents", (req, res) => {
    res.status(201).json(addDocument(req.params.id, req.body));
  });

  app.post("/api/knowledge-bases/:id/retrieval-test", (req, res) => {
    res.json(retrievalTest(req.params.id, req.body));
  });
}
