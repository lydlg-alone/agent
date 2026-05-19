import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001/api";

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
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

export async function fetchChatSessionDetail(sessionId) {
  const { data } = await api.get(`/chat/sessions/${sessionId}`);
  return data;
}

export async function renameChatSession(sessionId, payload) {
  const { data } = await api.patch(`/chat/sessions/${sessionId}`, payload);
  return data;
}

export async function deleteChatSession(sessionId) {
  const { data } = await api.delete(`/chat/sessions/${sessionId}`);
  return data;
}

export async function sendChatMessage(payload) {
  const { data } = await api.post("/chat/messages", payload, {
    timeout: 70000
  });
  return data;
}

export async function streamChatMessage(payload, handlers = {}) {
  const response = await fetch(`${apiBaseUrl}/chat/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify(payload),
    signal: handlers.signal
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed.message || "流式聊天请求失败。");
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || "流式聊天请求失败。");
      }
      throw error;
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("当前环境不支持流式响应读取。");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  const processBlock = (block) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");

    if (!data) {
      return;
    }

    const payload = JSON.parse(data);
    if (payload.type === "start") {
      handlers.onStart?.(payload);
      return;
    }
    if (payload.type === "delta") {
      handlers.onDelta?.(payload);
      return;
    }
    if (payload.type === "done") {
      handlers.onDone?.(payload);
      return;
    }
    if (payload.type === "error") {
      throw new Error(payload.message || "流式聊天请求失败。");
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      processBlock(block);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    processBlock(buffer);
  }
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
  const { data } = await api.post("/models/current/detect", payload, {
    timeout: 30000
  });
  return data;
}

export async function testRuntimeSettings(payload) {
  const { data } = await api.post("/models/test", payload, {
    timeout: 30000
  });
  return data;
}

export function subscribeRuntimeSettings(onMessage, onError) {
  const source = new EventSource(`${apiBaseUrl}/models/current/stream`);

  source.onmessage = (event) => {
    try {
      onMessage?.(JSON.parse(event.data));
    } catch (error) {
      onError?.(error);
    }
  };

  source.onerror = (error) => {
    onError?.(error);
  };

  return () => {
    source.close();
  };
}

export async function fetchProviderTemplates() {
  const { data } = await api.get("/models/templates");
  return data;
}

export async function fetchConnectionHistory() {
  const { data } = await api.get("/models/history");
  return data;
}

export async function clearConnectionHistory() {
  await api.delete("/models/history");
}

export async function fetchRecentSuccessfulModels() {
  const { data } = await api.get("/models/recent-successful");
  return data;
}

export async function exportModelConfig() {
  const { data } = await api.post("/models/export");
  return data;
}

export async function importModelConfig(config) {
  const { data } = await api.post("/models/import", config);
  return data;
}
