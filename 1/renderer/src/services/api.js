import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001/api";

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
});

function buildQuery(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

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
      throw new Error(parsed.message || "Streaming chat request failed.");
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || "Streaming chat request failed.");
      }
      throw error;
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("The current environment does not support stream reading.");
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

    const parsed = JSON.parse(data);
    if (parsed.type === "start") {
      handlers.onStart?.(parsed);
      return;
    }
    if (parsed.type === "delta") {
      handlers.onDelta?.(parsed);
      return;
    }
    if (parsed.type === "done") {
      handlers.onDone?.(parsed);
      return;
    }
    if (parsed.type === "error") {
      throw new Error(parsed.message || "Streaming chat request failed.");
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

export async function fetchAnalytics() {
  const { data } = await api.get("/analytics/overview");
  return data;
}

export async function fetchStudySets(params = {}) {
  const { data } = await api.get("/study-sets", {
    params: buildQuery(params)
  });
  return data;
}

export async function createStudySet(payload) {
  const { data } = await api.post("/study-sets", payload);
  return data;
}

export async function fetchStudySetDetail(studySetId) {
  const { data } = await api.get(`/study-sets/${studySetId}`);
  return data;
}

export async function updateStudySet(studySetId, payload) {
  const { data } = await api.put(`/study-sets/${studySetId}`, payload);
  return data;
}

export async function deleteStudySet(studySetId) {
  const { data } = await api.delete(`/study-sets/${studySetId}`);
  return data;
}

export async function fetchFlashcards(studySetId, params = {}) {
  const { data } = await api.get(`/study-sets/${studySetId}/flashcards`, {
    params: buildQuery(params)
  });
  return data;
}

export async function createFlashcard(studySetId, payload) {
  const { data } = await api.post(`/study-sets/${studySetId}/flashcards`, payload);
  return data;
}

export async function updateFlashcard(flashcardId, payload) {
  const { data } = await api.put(`/flashcards/${flashcardId}`, payload);
  return data;
}

export async function deleteFlashcard(flashcardId) {
  const { data } = await api.delete(`/flashcards/${flashcardId}`);
  return data;
}

export async function reviewFlashcard(flashcardId, quality) {
  const { data } = await api.post(`/flashcards/${flashcardId}/review`, { quality });
  return data;
}

export async function fetchStudySetQuizzes(studySetId) {
  const { data } = await api.get(`/quizzes/study-set/${studySetId}`);
  return data;
}

export async function fetchQuizDetail(quizId) {
  const { data } = await api.get(`/quizzes/${quizId}`);
  return data;
}

export async function generateQuiz(payload) {
  const { data } = await api.post("/quizzes/generate", payload);
  return data;
}

export async function submitQuizAttempt(quizId, payload) {
  const { data } = await api.post(`/quizzes/${quizId}/attempts`, payload);
  return data;
}

export async function retryQuiz(quizId, payload) {
  const { data } = await api.post(`/quizzes/${quizId}/retry`, payload);
  return data;
}

export async function fetchQuizAttempts(quizId) {
  const { data } = await api.get(`/quizzes/${quizId}/attempts`);
  return data;
}

export async function fetchAllNotes() {
  const { data } = await api.get("/notes");
  return data;
}

export async function fetchNoteDetail(noteId) {
  const { data } = await api.get(`/notes/${noteId}`);
  return data;
}

export async function fetchStudySetNotes(studySetId) {
  const { data } = await api.get(`/study-sets/${studySetId}/notes`);
  return data;
}

export async function createStudySetNote(studySetId, payload) {
  const { data } = await api.post(`/study-sets/${studySetId}/notes`, payload);
  return data;
}

export async function updateStudySetNote(noteId, payload) {
  const { data } = await api.put(`/notes/${noteId}`, payload);
  return data;
}

export async function deleteStudySetNote(noteId) {
  const { data } = await api.delete(`/notes/${noteId}`);
  return data;
}

export async function generateNote(payload) {
  const { data } = await api.post("/notes/generate", payload);
  return data;
}

export async function fetchStudySetDocuments(studySetId) {
  const { data } = await api.get(`/study-sets/${studySetId}/documents`);
  return data;
}

export async function createStudySetDocument(studySetId, payload) {
  const { data } = await api.post(`/study-sets/${studySetId}/documents`, payload);
  return data;
}

export async function fetchStudySetSources(studySetId, params = {}) {
  const { data } = await api.get(`/study-sets/${studySetId}/sources`, {
    params: buildQuery(params)
  });
  return data;
}

export async function fetchLearningPlans() {
  const { data } = await api.get("/learning-plans");
  return data;
}

export async function fetchLearningPlanDetail(planId) {
  const { data } = await api.get(`/learning-plans/${planId}`);
  return data;
}

export async function updateLearningPlan(planId, payload) {
  const { data } = await api.patch(`/learning-plans/${planId}`, payload);
  return data;
}

export async function deleteLearningPlan(planId) {
  const { data } = await api.delete(`/learning-plans/${planId}`);
  return data;
}
