import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001/api";

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 8000
});

export async function fetchWorkspace() {
  const { data } = await api.get("/chat/workspace");
  return data;
}

export async function createChatSession(payload = {}) {
  const { data } = await api.post("/chat/sessions", payload);
  return data;
}

export async function clearChatSession(sessionId) {
  const { data } = await api.post(`/chat/sessions/${sessionId}/clear`);
  return data;
}

export async function sendChatMessage(payload) {
  const { data } = await api.post("/chat/messages", payload);
  return data;
}

export async function uploadChatAttachment(payload) {
  const { data } = await api.post("/chat/attachments", payload);
  return data;
}

export async function fetchKnowledgeDocuments(search = "") {
  const { data } = await api.get("/knowledge/documents", {
    params: search ? { search } : undefined
  });
  return data;
}

export async function importKnowledgeFiles(files) {
  const { data } = await api.post("/knowledge/import", { files });
  return data;
}

export async function deleteKnowledgeDocument(documentId) {
  await api.delete(`/knowledge/documents/${documentId}`);
}

export async function clearKnowledgeDocuments() {
  await api.delete("/knowledge/documents");
}

export async function fetchKnowledgeBases() {
  const { data } = await api.get("/knowledge-bases");
  return data;
}

export async function fetchAgents() {
  const { data } = await api.get("/agents");
  return data;
}

export async function activateAgent(agentId) {
  const { data } = await api.post(`/agents/${agentId}/activate`);
  return data;
}

export async function fetchActiveAgent() {
  const { data } = await api.get("/agents/active");
  return data;
}

export async function fetchRuntimeSettings() {
  const { data } = await api.get("/models/current");
  return data;
}

export async function saveRuntimeSettings(payload) {
  const { data } = await api.post("/models/current", payload);
  return data;
}

export async function detectCurrentModel(payload) {
  const { data } = await api.post("/models/current/detect", payload);
  return data;
}

export async function testRuntimeSettings(payload) {
  const { data } = await api.post("/models/test", payload);
  return data;
}
