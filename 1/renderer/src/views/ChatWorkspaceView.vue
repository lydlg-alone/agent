<template>
  <div class="chat-workspace">
    <aside class="session-panel">
      <div class="session-panel__header">
        <div>
          <span class="workspace-tag">Chat</span>
          <h2>聊天 / 多智能体学习空间</h2>
          <p>围绕当前模型、知识库与协同智能体展开任务对话。</p>
        </div>
        <el-button type="primary" plain @click="handleCreateSession">新建对话</el-button>
      </div>

      <div class="session-list">
        <button
          v-for="session in sessions"
          :key="session.id"
          type="button"
          class="session-item"
          :class="{ 'session-item--active': session.id === activeSessionId }"
          @click="loadSession(session.id)"
        >
          <span class="session-item__title">{{ session.title }}</span>
          <span class="session-item__meta">
            {{ formatRelativeTime(session.updatedAt) }} · {{ session.messageCount }} 条消息
          </span>
          <span class="session-item__preview">{{ session.lastMessagePreview || "等待开始" }}</span>
        </button>
      </div>
    </aside>

    <section class="conversation-shell">
      <header class="conversation-header">
        <div>
          <span class="workspace-tag">Workspace</span>
          <h1>{{ activeSessionTitle }}</h1>
        </div>

        <div class="conversation-header__meta">
          <span class="model-pill">
            {{ currentModel?.name || "未配置模型" }}
          </span>
          <span class="provider-pill">
            {{ currentModel?.provider || "Local" }}
          </span>
        </div>
      </header>

      <div class="message-stream" v-loading="workspaceLoading || sessionLoading">
        <article
          v-for="message in messages"
          :key="message.id"
          class="message-card"
          :class="message.role === 'user' ? 'message-card--user' : 'message-card--assistant'"
        >
          <div class="message-card__avatar">
            {{ message.role === "user" ? "U" : "AI" }}
          </div>

          <div class="message-card__body">
            <div class="message-card__meta">
              <strong>{{ message.role === "user" ? "你" : "学习助手" }}</strong>
              <span>{{ formatAbsoluteTime(message.createdAt) }}</span>
            </div>

            <p class="message-card__content">{{ message.content }}</p>

            <div v-if="message.attachments?.length" class="message-attachments">
              <span class="attachment-chip" v-for="attachment in message.attachments" :key="attachment.id">
                {{ attachment.name }}
              </span>
            </div>

            <div v-if="message.role === 'assistant' && message.agentStatuses?.length" class="agent-timeline">
              <div v-for="agent in message.agentStatuses" :key="agent.agentId" class="agent-timeline__item">
                <span class="agent-timeline__state" :class="`agent-timeline__state--${agent.state}`"></span>
                <div>
                  <strong>{{ agent.name }}</strong>
                  <p>{{ agent.summary }}</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <div v-if="!messages.length && !workspaceLoading" class="empty-state">
          暂无消息，输入指令或上传附件开始协同学习。
        </div>
      </div>

      <footer class="composer-shell">
        <div v-if="pendingAttachments.length" class="pending-attachments">
          <span class="pending-attachments__label">待发送附件</span>
          <span v-for="attachment in pendingAttachments" :key="attachment.id" class="attachment-chip">
            {{ attachment.name }}
          </span>
        </div>

        <div class="composer-card">
          <button type="button" class="composer-action" :disabled="uploading" @click="triggerFilePicker">
            上传附件
          </button>

          <textarea
            v-model="composerText"
            class="composer-input"
            rows="3"
            placeholder="输入学习指令，例如：基于附件内容梳理考点，并给出两周学习计划"
            @keydown.enter.exact.prevent="handleSendMessage"
          />

          <button type="button" class="composer-submit" :disabled="sending" @click="handleSendMessage">
            {{ sending ? "发送中..." : "发送" }}
          </button>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          multiple
          class="hidden-file-input"
          @change="handleFileChange"
        />
      </footer>
    </section>

    <aside class="status-panel">
      <section class="status-card">
        <span class="workspace-tag">Model</span>
        <h3>当前模型</h3>
        <p>{{ currentModel?.name || "未配置默认模型" }}</p>
        <small>{{ currentModel?.modelId || "请先在模型配置中设置默认模型" }}</small>
      </section>

      <section class="status-card">
        <span class="workspace-tag">Agents</span>
        <h3>协同状态</h3>
        <div class="status-agent-list">
          <article v-for="agent in displayedAgentStatuses" :key="agent.agentId || agent.role" class="status-agent">
            <div class="status-agent__header">
              <strong>{{ agent.name }}</strong>
              <span class="status-badge" :class="`status-badge--${agent.state}`">
                {{ stateLabelMap[agent.state] || agent.state }}
              </span>
            </div>
            <p>{{ agent.summary }}</p>
          </article>
        </div>
      </section>

      <section class="status-card">
        <span class="workspace-tag">Attachments</span>
        <h3>已上传附件</h3>
        <div v-if="sessionAttachments.length" class="attachment-list">
          <article v-for="attachment in sessionAttachments" :key="attachment.id" class="attachment-item">
            <strong>{{ attachment.name }}</strong>
            <span>{{ formatFileSize(attachment.sizeBytes) }}</span>
          </article>
        </div>
        <p v-else class="empty-copy">当前会话还没有附件。</p>
      </section>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/services/api.js";

const stateLabelMap = {
  idle: "待命",
  queued: "排队中",
  running: "执行中",
  completed: "已完成"
};

const workspaceLoading = ref(false);
const sessionLoading = ref(false);
const uploading = ref(false);
const sending = ref(false);
const sessions = ref([]);
const messages = ref([]);
const sessionAttachments = ref([]);
const pendingAttachments = ref([]);
const agentCatalog = ref([]);
const currentModel = ref(null);
const activeSessionId = ref("");
const activeSessionTitle = ref("聊天工作区");
const composerText = ref("");
const transientAgentStatuses = ref([]);
const fileInputRef = ref(null);

const displayedAgentStatuses = computed(() => {
  if (transientAgentStatuses.value.length) {
    return transientAgentStatuses.value;
  }

  const latestAssistant = [...messages.value]
    .reverse()
    .find((item) => item.role === "assistant" && item.agentStatuses?.length);

  if (latestAssistant?.agentStatuses?.length) {
    return latestAssistant.agentStatuses;
  }

  return agentCatalog.value.map((agent) => ({
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    state: "idle",
    summary:
      agent.role === "retrieval"
        ? "等待检索任务，尚未分析知识库或附件。"
        : "等待规划任务，尚未生成回答结构。"
  }));
});

function normalizeModel(model) {
  if (!model) {
    return null;
  }

  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    modelId: model.modelId || model.model_id || ""
  };
}

function applySession(session) {
  activeSessionId.value = session.id;
  activeSessionTitle.value = session.title;
  messages.value = session.messages || [];
  sessionAttachments.value = session.attachments || [];
  pendingAttachments.value = [];
  transientAgentStatuses.value = [];
}

async function loadWorkspace(preferredSessionId) {
  workspaceLoading.value = true;
  try {
    const { data } = await api.get("/chat/workspace");
    sessions.value = data.sessions || [];
    agentCatalog.value = data.agentCatalog || [];
    currentModel.value = normalizeModel(data.currentModel);

    const targetId = preferredSessionId || activeSessionId.value || data.activeSessionId;
    if (data.activeSession && data.activeSession.id === targetId) {
      applySession(data.activeSession);
      return;
    }

    if (targetId) {
      await loadSession(targetId);
    }
  } finally {
    workspaceLoading.value = false;
  }
}

async function loadSession(sessionId) {
  sessionLoading.value = true;
  try {
    const { data } = await api.get(`/chat/sessions/${sessionId}`);
    applySession(data);
  } finally {
    sessionLoading.value = false;
  }
}

async function handleCreateSession() {
  const { data } = await api.post("/chat/sessions", {});
  pendingAttachments.value = [];
  transientAgentStatuses.value = [];
  await loadWorkspace(data.id);
}

async function ensureSessionId() {
  if (activeSessionId.value) {
    return activeSessionId.value;
  }

  const { data } = await api.post("/chat/sessions", {});
  await loadWorkspace(data.id);
  return data.id;
}

function triggerFilePicker() {
  fileInputRef.value?.click();
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function formatRelativeTime(value) {
  if (!value) {
    return "刚刚";
  }

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }

  return `${Math.floor(hours / 24)} 天前`;
}

function formatAbsoluteTime(value) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatFileSize(sizeBytes) {
  if (!sizeBytes) {
    return "0 B";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shouldReadAsText(file) {
  const textExtensions = [".md", ".txt", ".json", ".js", ".ts", ".html", ".css", ".csv"];
  return (
    file.type.startsWith("text/") ||
    textExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))
  );
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`读取文件失败：${file.name}`));
    reader.readAsText(file, "utf-8");
  });
}

async function handleFileChange(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";

  if (!files.length) {
    return;
  }

  const sessionId = await ensureSessionId();
  uploading.value = true;
  transientAgentStatuses.value = agentCatalog.value.map((agent) => ({
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    state: agent.role === "retrieval" ? "running" : "queued",
    summary:
      agent.role === "retrieval"
        ? "正在读取并整理你刚上传的附件内容。"
        : "等待检索结果回传后生成规划。"
  }));

  try {
    for (const file of files) {
      const contentText = shouldReadAsText(file) ? await readFileAsText(file) : "";
      const { data } = await api.post("/chat/attachments", {
        sessionId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentText
      });

      sessionAttachments.value = [...sessionAttachments.value, data];
      pendingAttachments.value = [...pendingAttachments.value, data];
    }

    ElMessage.success(`已上传 ${files.length} 个附件`);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "附件上传失败"));
  } finally {
    uploading.value = false;
    transientAgentStatuses.value = [];
  }
}

async function handleSendMessage() {
  if (!composerText.value.trim() && !pendingAttachments.value.length) {
    ElMessage.warning("请输入指令或先上传附件");
    return;
  }

  const sessionId = await ensureSessionId();
  sending.value = true;
  transientAgentStatuses.value = agentCatalog.value.map((agent) => ({
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    state: "running",
    summary:
      agent.role === "retrieval"
        ? "正在结合知识库和附件定位相关内容。"
        : "正在拆解任务并组织回答结构。"
  }));

  try {
    await api.post("/chat/messages", {
      sessionId,
      content: composerText.value.trim() || "请结合我刚上传的附件给出分析。",
      attachmentIds: pendingAttachments.value.map((attachment) => attachment.id)
    });

    composerText.value = "";
    pendingAttachments.value = [];
    await loadWorkspace(sessionId);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "消息发送失败"));
  } finally {
    sending.value = false;
    transientAgentStatuses.value = [];
  }
}

onMounted(() => {
  loadWorkspace();
});
</script>

<style scoped>
.chat-workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 320px;
  gap: 20px;
  min-height: 72vh;
}

.session-panel,
.conversation-shell,
.status-card {
  border: 1px solid var(--line);
  border-radius: 28px;
  background: rgba(255, 251, 246, 0.92);
  box-shadow: var(--shadow);
}

.session-panel,
.conversation-shell {
  display: flex;
  flex-direction: column;
}

.session-panel {
  padding: 22px;
}

.workspace-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(182, 90, 42, 0.12);
  color: var(--accent-deep);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.session-panel__header {
  display: grid;
  gap: 16px;
}

.session-panel__header h2,
.conversation-header h1,
.status-card h3 {
  margin: 10px 0 8px;
}

.session-panel__header p,
.status-card p,
.status-agent p,
.attachment-item span,
.message-card__meta span,
.session-item__meta,
.session-item__preview {
  color: var(--ink-soft);
}

.session-list {
  display: grid;
  gap: 12px;
  margin-top: 22px;
}

.session-item {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: 0.2s ease;
}

.session-item:hover,
.session-item--active {
  border-color: rgba(182, 90, 42, 0.2);
  background: #ffffff;
}

.session-item__title,
.message-card__meta strong,
.attachment-item strong,
.status-agent__header strong {
  display: block;
  font-size: 15px;
}

.session-item__meta,
.session-item__preview,
.status-card small,
.message-card__meta span {
  display: block;
  font-size: 12px;
}

.session-item__preview {
  margin-top: 8px;
  line-height: 1.5;
}

.conversation-shell {
  overflow: hidden;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(140deg, rgba(182, 90, 42, 0.12), rgba(255, 255, 255, 0.92));
}

.conversation-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.model-pill,
.provider-pill,
.attachment-chip,
.pending-attachments__label,
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
}

.model-pill {
  background: rgba(182, 90, 42, 0.14);
  color: var(--accent-deep);
}

.provider-pill,
.attachment-chip {
  background: rgba(111, 44, 19, 0.08);
}

.message-stream {
  flex: 1;
  padding: 24px 28px;
  overflow: auto;
  display: grid;
  gap: 18px;
}

.message-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
}

.message-card--user {
  grid-template-columns: minmax(0, 1fr) 48px;
}

.message-card--user .message-card__avatar {
  order: 2;
}

.message-card--user .message-card__body {
  order: 1;
  background: linear-gradient(135deg, #b65a2a, #8b3f1c);
  color: #fff8f2;
}

.message-card--user .message-card__meta span,
.message-card--user .message-card__content {
  color: rgba(255, 248, 242, 0.88);
}

.message-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: rgba(182, 90, 42, 0.16);
  color: var(--accent-deep);
}

.message-card__body {
  padding: 18px;
  border: 1px solid rgba(182, 90, 42, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
}

.message-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.message-card__content {
  margin: 12px 0 0;
  white-space: pre-wrap;
  line-height: 1.7;
}

.message-attachments,
.pending-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.agent-timeline {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(182, 90, 42, 0.14);
}

.agent-timeline__item {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 12px;
}

.agent-timeline__item p {
  margin: 6px 0 0;
}

.agent-timeline__state {
  width: 12px;
  height: 12px;
  margin-top: 5px;
  border-radius: 999px;
  background: #d0d5dd;
}

.agent-timeline__state--completed,
.status-badge--completed {
  background: rgba(76, 175, 80, 0.16);
  color: #2e7d32;
}

.agent-timeline__state--running,
.status-badge--running {
  background: rgba(182, 90, 42, 0.18);
  color: var(--accent-deep);
}

.agent-timeline__state--queued,
.status-badge--queued {
  background: rgba(255, 193, 7, 0.2);
  color: #8a6100;
}

.agent-timeline__state--idle,
.status-badge--idle {
  background: rgba(82, 96, 113, 0.14);
  color: var(--ink-soft);
}

.composer-shell {
  padding: 20px 24px 24px;
  border-top: 1px solid var(--line);
  background: rgba(255, 247, 239, 0.9);
}

.composer-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border-radius: 24px;
  border: 1px solid rgba(182, 90, 42, 0.16);
  background: #fffdf9;
}

.composer-action,
.composer-submit {
  border: none;
  border-radius: 18px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 600;
}

.composer-action {
  background: rgba(111, 44, 19, 0.08);
  color: var(--accent-deep);
}

.composer-submit {
  background: linear-gradient(135deg, #b65a2a, #8b3f1c);
  color: #fff8f2;
}

.composer-action:disabled,
.composer-submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.composer-input {
  width: 100%;
  border: none;
  resize: none;
  outline: none;
  background: transparent;
  font: inherit;
  line-height: 1.6;
  color: var(--ink);
}

.status-panel {
  display: grid;
  gap: 18px;
}

.status-card {
  padding: 22px;
}

.status-agent-list,
.attachment-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.status-agent,
.attachment-item {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(182, 90, 42, 0.12);
}

.status-agent__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.status-badge {
  padding: 5px 10px;
}

.attachment-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.empty-state,
.empty-copy {
  color: var(--ink-soft);
}

.hidden-file-input {
  display: none;
}

@media (max-width: 1480px) {
  .chat-workspace {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .status-panel {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .chat-workspace,
  .status-panel,
  .composer-card {
    grid-template-columns: 1fr;
  }

  .conversation-header,
  .message-card__meta,
  .status-agent__header,
  .attachment-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .message-card,
  .message-card--user {
    grid-template-columns: 1fr;
  }

  .message-card--user .message-card__avatar,
  .message-card--user .message-card__body {
    order: initial;
  }
}
</style>
