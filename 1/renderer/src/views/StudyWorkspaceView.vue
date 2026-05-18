<template>
  <div class="study-shell">
    <nav class="side-nav">
      <div class="brand-mark">AI</div>

      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        class="nav-button"
        :class="{ 'nav-button--active': currentPage === item.key }"
        :title="item.label"
        @click="currentPage = item.key"
      >
        <span>{{ item.short }}</span>
      </button>
    </nav>

    <main class="workspace-main">
      <section v-show="currentPage === 'chat'" class="page-view page-view--chat">
        <header class="top-bar">
          <div>
            <div class="online-row">
              <span class="online-dot"></span>
              <strong>{{ activeAgent?.name || "默认学习助手" }}</strong>
            </div>
            <p class="sub-copy">{{ currentModel?.name || "未配置模型" }}</p>
          </div>

          <div class="top-actions">
            <span class="model-pill">{{ currentModel?.modelId || "自动识别" }}</span>
            <button type="button" class="icon-button" :disabled="loading.chat" @click="handleNewSession">
              新会话
            </button>
            <button type="button" class="icon-button" :disabled="loading.chat" @click="handleClearChat">
              清空聊天
            </button>
          </div>
        </header>

        <div class="chat-grid">
          <section class="chat-column">
            <div class="quick-prompts">
              <button
                v-for="prompt in quickPrompts"
                :key="prompt"
                type="button"
                class="quick-chip"
                @click="composerText = prompt"
              >
                {{ prompt }}
              </button>
            </div>

            <div class="message-list">
              <article
                v-for="message in messages"
                :key="message.id"
                class="message-row"
                :class="message.role === 'user' ? 'message-row--user' : 'message-row--assistant'"
              >
                <div class="message-card">
                  <div class="message-meta">
                    <strong>{{ message.role === "user" ? "你" : activeAgent?.name || "学习助手" }}</strong>
                    <span>{{ formatMessageTime(message.createdAt) }}</span>
                  </div>

                  <p class="message-content">{{ message.content }}</p>

                  <div v-if="message.attachments?.length" class="attachment-chips">
                    <span v-for="attachment in message.attachments" :key="attachment.id" class="attachment-chip">
                      {{ attachment.name }}
                    </span>
                  </div>

                  <div v-if="message.role === 'assistant' && message.agentStatuses?.length" class="timeline-list">
                    <div v-for="agent in message.agentStatuses" :key="agent.agentId" class="timeline-item">
                      <span class="timeline-dot" :class="`timeline-dot--${agent.state}`"></span>
                      <div>
                        <strong>{{ agent.name }}</strong>
                        <p>{{ agent.summary }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <div v-if="!messages.length && !loading.workspace" class="empty-block">
                暂无消息，输入学习任务或上传资料开始。
              </div>
            </div>

            <footer class="composer-panel">
              <div v-if="pendingAttachments.length" class="attachment-chips">
                <span class="attachment-label">待发送附件</span>
                <span v-for="attachment in pendingAttachments" :key="attachment.id" class="attachment-chip">
                  {{ attachment.name }}
                </span>
              </div>

              <div class="composer-box">
                <button type="button" class="composer-attach" :disabled="loading.upload" @click="triggerChatFilePicker">
                  导入资料
                </button>
                <textarea
                  ref="composerRef"
                  v-model="composerText"
                  class="composer-input"
                  rows="1"
                  placeholder="输入你的学习任务，例如：基于资料生成两周复习计划，并给出每日任务。"
                  @input="resizeComposer"
                  @keydown.enter.exact.prevent="handleSendMessage"
                />
                <button type="button" class="send-button" :disabled="loading.send" @click="handleSendMessage">
                  {{ loading.send ? "发送中" : "发送" }}
                </button>
              </div>

              <div class="hint-row">
                <span>Enter 发送，Shift + Enter 换行</span>
                <span>{{ runtimeStatusText }}</span>
              </div>
            </footer>
          </section>

          <aside class="status-column">
            <section class="surface-card">
              <div class="card-head">
                <h3>协同状态</h3>
                <span>{{ activeAgent?.name || "未激活" }}</span>
              </div>
              <div class="status-list">
                <article v-for="agent in displayedAgentStatuses" :key="agent.agentId || agent.role" class="status-item">
                  <div class="status-item__head">
                    <strong>{{ agent.name }}</strong>
                    <span class="status-badge" :class="`status-badge--${agent.state}`">
                      {{ statusLabels[agent.state] || agent.state }}
                    </span>
                  </div>
                  <p>{{ agent.summary }}</p>
                </article>
              </div>
            </section>

            <section class="surface-card">
              <div class="card-head">
                <h3>会话附件</h3>
                <span>{{ sessionAttachments.length }} 个</span>
              </div>
              <div v-if="sessionAttachments.length" class="status-list">
                <article v-for="attachment in sessionAttachments" :key="attachment.id" class="mini-item">
                  <strong>{{ attachment.name }}</strong>
                  <span>{{ formatSize(attachment.sizeBytes) }}</span>
                </article>
              </div>
              <p v-else class="empty-copy">当前会话还没有附件。</p>
            </section>

            <section class="surface-card">
              <div class="card-head">
                <h3>当前状态</h3>
                <span>实时</span>
              </div>
              <div class="metric-list">
                <div class="metric-row">
                  <span>当前会话</span>
                  <strong>{{ activeSession?.title || "新建对话" }}</strong>
                </div>
                <div class="metric-row">
                  <span>知识文档</span>
                  <strong>{{ knowledgeStats.totalCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>资料大小</span>
                  <strong>{{ knowledgeStats.totalSize }}</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section v-show="currentPage === 'kb'" class="page-view">
        <div class="page-header">
          <div>
            <h1>知识库中心</h1>
            <p>导入后的资料会进入默认知识库，并可被聊天页直接引用。</p>
          </div>
          <div class="page-actions">
            <button type="button" class="primary-button" :disabled="loading.importing" @click="triggerKnowledgeFilePicker">
              导入本地文档
            </button>
            <button type="button" class="secondary-button" :disabled="loading.importing" @click="handleClearKnowledge">
              清空知识库
            </button>
          </div>
        </div>

        <div class="stats-grid">
          <article class="surface-card metric-card">
            <span>文档总数</span>
            <strong>{{ knowledgeStats.totalCount }}</strong>
          </article>
          <article class="surface-card metric-card">
            <span>累计大小</span>
            <strong>{{ knowledgeStats.totalSize }}</strong>
          </article>
          <article class="surface-card metric-card">
            <span>最近导入</span>
            <strong class="metric-card__title">{{ knowledgeStats.latestName }}</strong>
          </article>
        </div>

        <div class="surface-card toolbar-card">
          <input
            v-model.trim="knowledgeSearch"
            type="text"
            class="search-input"
            placeholder="搜索文档名称"
          />
          <span class="toolbar-copy">{{ knowledgeSummaryText }}</span>
        </div>

        <div v-if="!filteredKnowledgeDocuments.length" class="surface-card empty-card">
          <h3>还没有可用资料</h3>
          <p>支持导入 PDF、Word、Markdown、TXT、PPT、CSV 等常见格式。</p>
        </div>

        <div v-else class="document-grid">
          <article v-for="doc in filteredKnowledgeDocuments" :key="doc.id" class="surface-card document-card">
            <div class="document-card__head">
              <span class="doc-badge">{{ doc.sourceType.toUpperCase() }}</span>
              <button type="button" class="link-button" @click="handleDeleteKnowledgeDocument(doc.id)">
                删除
              </button>
            </div>
            <h3>{{ doc.name }}</h3>
            <p>{{ doc.summary || "已登记到知识库，可在聊天页直接引用。" }}</p>
            <div class="document-meta">
              <span>{{ doc.knowledgeBaseName || "默认知识库" }}</span>
              <span>{{ formatSize(doc.sizeBytes) }}</span>
              <span>{{ formatDate(doc.createdAt) }}</span>
            </div>
          </article>
        </div>
      </section>

      <section v-show="currentPage === 'market'" class="page-view">
        <div class="page-header">
          <div>
            <h1>智能体市场</h1>
            <p>切换不同学习角色后，聊天页会联动当前助手定位。</p>
          </div>
          <div class="page-actions page-actions--text">
            当前激活：<strong>{{ activeAgent?.name || "默认学习助手" }}</strong>
          </div>
        </div>

        <div class="agent-grid">
          <article
            v-for="agent in marketAgents"
            :key="agent.id"
            class="surface-card agent-card"
            :class="{ 'agent-card--active': activeAgent?.id === agent.id }"
          >
            <div class="agent-card__head">
              <div class="agent-icon">{{ agent.role.slice(0, 1).toUpperCase() }}</div>
              <span class="doc-badge">{{ agent.modelBinding }}</span>
            </div>
            <h3>{{ agent.name }}</h3>
            <p>{{ agent.promptTemplate }}</p>
            <div class="agent-foot">
              <span>{{ agent.knowledgeScope }}</span>
              <button
                type="button"
                class="primary-button primary-button--small"
                :disabled="activeAgent?.id === agent.id"
                @click="handleActivateAgent(agent.id)"
              >
                {{ activeAgent?.id === agent.id ? "已激活" : "切换到此角色" }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section v-show="currentPage === 'settings'" class="page-view">
        <div class="page-header page-header--stacked">
          <div>
            <h1>API 接入配置</h1>
            <p>填写 Base URL 与 API Key 后，系统会保存当前运行配置并自动识别模型。</p>
          </div>
        </div>

        <div class="settings-shell">
          <form class="surface-card settings-card" @submit.prevent="handleSaveSettings">
            <label class="field-block">
              <span>当前模型</span>
              <div class="inline-field">
                <input v-model="settings.modelId" type="text" class="text-input" readonly />
                <button type="button" class="secondary-button" @click="handleDetectModel">读取模型</button>
              </div>
            </label>

            <label class="field-block">
              <span>API Key</span>
              <input
                v-model="settings.apiKey"
                type="password"
                class="text-input"
                :placeholder="settings.apiKeyMasked || 'sk-xxxxxxxxxxxxxxxx'"
              />
            </label>

            <label class="field-block">
              <span>API Base URL</span>
              <input v-model="settings.baseUrl" type="text" class="text-input" placeholder="https://api.example.com/v1" />
            </label>

            <label class="field-block">
              <span>系统提示词</span>
              <textarea
                v-model="settings.systemPrompt"
                rows="5"
                class="text-input text-input--textarea"
                placeholder="定义你的学习助手角色、答题风格和回答约束。"
              />
            </label>

            <div class="settings-actions">
              <button type="submit" class="primary-button" :disabled="loading.settingsSave">保存配置</button>
              <button type="button" class="secondary-button" :disabled="loading.settingsTest" @click="handleTestConnection">
                测试连接
              </button>
            </div>
          </form>

          <div class="settings-side">
            <section class="surface-card info-card">
              <h3>当前状态</h3>
              <p>{{ runtimeStatusText }}</p>
            </section>

            <section class="surface-card info-card">
              <h3>运行摘要</h3>
              <div class="metric-list">
                <div class="metric-row">
                  <span>Provider</span>
                  <strong>{{ settings.provider || currentModel?.provider || "未识别" }}</strong>
                </div>
                <div class="metric-row">
                  <span>模型</span>
                  <strong>{{ settings.modelId || currentModel?.modelId || "未识别" }}</strong>
                </div>
                <div class="metric-row">
                  <span>API Key</span>
                  <strong>{{ settings.apiKeyMasked || (settings.apiKey ? "已填写" : "未填写") }}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>

    <input ref="chatFileInputRef" type="file" class="hidden-file-input" multiple @change="handleChatFileChange" />
    <input ref="knowledgeFileInputRef" type="file" class="hidden-file-input" multiple @change="handleKnowledgeFileChange" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  activateAgent,
  clearChatSession,
  clearKnowledgeDocuments,
  createChatSession,
  deleteKnowledgeDocument,
  detectCurrentModel,
  fetchAgents,
  fetchKnowledgeBases,
  fetchKnowledgeDocuments,
  fetchRuntimeSettings,
  fetchWorkspace,
  importKnowledgeFiles,
  saveRuntimeSettings,
  sendChatMessage,
  testRuntimeSettings,
  uploadChatAttachment
} from "@/services/api.js";

const navItems = [
  { key: "chat", label: "聊天", short: "聊" },
  { key: "kb", label: "知识库", short: "知" },
  { key: "market", label: "智能体", short: "体" },
  { key: "settings", label: "设置", short: "设" }
];

const quickPrompts = [
  "基于知识库生成今天的复习计划",
  "提炼最近资料中的 10 个核心概念",
  "从知识库生成一组模拟测试题",
  "把复杂内容总结成背诵提纲"
];

const statusLabels = {
  idle: "待命",
  queued: "排队中",
  running: "执行中",
  completed: "已完成"
};

const currentPage = ref("chat");
const composerRef = ref(null);
const chatFileInputRef = ref(null);
const knowledgeFileInputRef = ref(null);
const composerText = ref("");
const knowledgeSearch = ref("");

const loading = reactive({
  workspace: false,
  chat: false,
  send: false,
  upload: false,
  importing: false,
  settingsSave: false,
  settingsTest: false
});

const workspace = reactive({
  currentModel: null,
  activeAgent: null,
  agentCatalog: [],
  sessions: [],
  activeSessionId: "",
  activeSession: null
});

const settings = reactive({
  provider: "",
  baseUrl: "",
  apiKey: "",
  apiKeyMasked: "",
  systemPrompt: "",
  modelId: ""
});

const allAgents = ref([]);
const knowledgeBases = ref([]);
const knowledgeDocuments = ref([]);
const pendingAttachments = ref([]);
const sessionAttachments = ref([]);
const messages = ref([]);

const currentModel = computed(() => workspace.currentModel);
const activeAgent = computed(() => workspace.activeAgent);
const activeSession = computed(() => workspace.activeSession);

const marketAgents = computed(() => allAgents.value.filter((agent) => !agent.isSystem));

const displayedAgentStatuses = computed(() => {
  const latestAssistant = [...messages.value]
    .reverse()
    .find((item) => item.role === "assistant" && item.agentStatuses?.length);

  if (latestAssistant?.agentStatuses?.length) {
    return latestAssistant.agentStatuses;
  }

  return workspace.agentCatalog.map((agent) => ({
    agentId: agent.id,
    name: agent.name,
    role: agent.role,
    state: "idle",
    summary:
      agent.role === "retrieval"
        ? "等待检索指令，尚未开始分析知识库或附件。"
        : "等待任务拆解，尚未生成回答策略。"
  }));
});

const filteredKnowledgeDocuments = computed(() => {
  const keyword = knowledgeSearch.value.trim().toLowerCase();
  if (!keyword) {
    return knowledgeDocuments.value;
  }

  return knowledgeDocuments.value.filter((doc) => doc.name.toLowerCase().includes(keyword));
});

const knowledgeStats = computed(() => {
  const totalBytes = knowledgeDocuments.value.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0);
  return {
    totalCount: knowledgeDocuments.value.length,
    totalSize: formatSize(totalBytes),
    latestName: knowledgeDocuments.value[0]?.name || "暂无文档"
  };
});

const knowledgeSummaryText = computed(() => {
  if (!knowledgeDocuments.value.length) {
    return "当前暂无可用文档";
  }

  return `当前共 ${knowledgeDocuments.value.length} 份资料，覆盖 ${knowledgeBases.value.length} 个知识库`;
});

const runtimeStatusText = computed(() => {
  if (settings.baseUrl && (settings.apiKey || settings.apiKeyMasked)) {
    return "已配置运行接口，聊天页会优先使用当前模型配置。";
  }

  return "当前为本地演示模式，未填写 API Base URL 或 API Key。";
});

function applyWorkspace(data) {
  workspace.currentModel = data.currentModel || null;
  workspace.activeAgent = data.activeAgent || null;
  workspace.agentCatalog = data.agentCatalog || [];
  workspace.sessions = data.sessions || [];
  workspace.activeSessionId = data.activeSessionId || "";
  workspace.activeSession = data.activeSession || null;
  messages.value = data.activeSession?.messages || [];
  sessionAttachments.value = data.activeSession?.attachments || [];
}

function applyRuntime(payload) {
  const runtime = payload?.settings || payload || {};
  settings.provider = runtime.provider || payload?.currentModel?.provider || "";
  settings.baseUrl = runtime.baseUrl || "";
  settings.apiKey = "";
  settings.apiKeyMasked = runtime.apiKeyMasked || "";
  settings.systemPrompt = runtime.systemPrompt || "";
  settings.modelId = runtime.modelId || payload?.currentModel?.modelId || "";
}

async function loadInitialData() {
  loading.workspace = true;
  try {
    const [workspaceData, docs, bases, agents, runtime] = await Promise.all([
      fetchWorkspace(),
      fetchKnowledgeDocuments(),
      fetchKnowledgeBases(),
      fetchAgents(),
      fetchRuntimeSettings()
    ]);

    applyWorkspace(workspaceData);
    knowledgeDocuments.value = docs;
    knowledgeBases.value = bases;
    allAgents.value = agents;
    applyRuntime(runtime);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "加载页面数据失败"));
  } finally {
    loading.workspace = false;
    nextTick(resizeComposer);
  }
}

async function refreshWorkspace() {
  const data = await fetchWorkspace();
  applyWorkspace(data);
}

async function refreshKnowledge() {
  const [docs, bases] = await Promise.all([fetchKnowledgeDocuments(), fetchKnowledgeBases()]);
  knowledgeDocuments.value = docs;
  knowledgeBases.value = bases;
}

async function refreshAgents() {
  allAgents.value = await fetchAgents();
}

async function ensureSessionId() {
  if (workspace.activeSessionId) {
    return workspace.activeSessionId;
  }

  const session = await createChatSession({});
  workspace.activeSessionId = session.id;
  workspace.activeSession = session;
  messages.value = session.messages || [];
  sessionAttachments.value = session.attachments || [];
  return session.id;
}

function triggerChatFilePicker() {
  chatFileInputRef.value?.click();
}

function triggerKnowledgeFilePicker() {
  knowledgeFileInputRef.value?.click();
}

async function handleNewSession() {
  loading.chat = true;
  try {
    const session = await createChatSession({});
    workspace.activeSessionId = session.id;
    workspace.activeSession = session;
    messages.value = session.messages || [];
    sessionAttachments.value = session.attachments || [];
    pendingAttachments.value = [];
    composerText.value = "";
    await refreshWorkspace();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "创建会话失败"));
  } finally {
    loading.chat = false;
    nextTick(resizeComposer);
  }
}

async function handleClearChat() {
  if (!workspace.activeSessionId) {
    return;
  }

  loading.chat = true;
  try {
    const session = await clearChatSession(workspace.activeSessionId);
    workspace.activeSession = session;
    messages.value = session.messages || [];
    sessionAttachments.value = session.attachments || [];
    pendingAttachments.value = [];
    ElMessage.success("当前会话已清空");
    await refreshWorkspace();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "清空聊天失败"));
  } finally {
    loading.chat = false;
  }
}

async function handleSendMessage() {
  if (!composerText.value.trim() && !pendingAttachments.value.length) {
    ElMessage.warning("请输入学习任务或先导入资料");
    return;
  }

  loading.send = true;
  try {
    const sessionId = await ensureSessionId();
    await sendChatMessage({
      sessionId,
      content: composerText.value.trim() || "请结合我刚上传的资料给出分析。",
      attachmentIds: pendingAttachments.value.map((item) => item.id)
    });

    composerText.value = "";
    pendingAttachments.value = [];
    await refreshWorkspace();
    nextTick(resizeComposer);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "发送消息失败"));
  } finally {
    loading.send = false;
  }
}

async function handleChatFileChange(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";

  if (!files.length) {
    return;
  }

  loading.upload = true;
  try {
    const sessionId = await ensureSessionId();
    const uploaded = [];

    for (const file of files) {
      const contentText = shouldReadAsText(file) ? await readFileAsText(file) : "";
      const data = await uploadChatAttachment({
        sessionId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentText
      });
      uploaded.push(data);
    }

    pendingAttachments.value = [...pendingAttachments.value, ...uploaded];
    sessionAttachments.value = [...sessionAttachments.value, ...uploaded];
    ElMessage.success(`已加入 ${uploaded.length} 个会话附件`);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "上传附件失败"));
  } finally {
    loading.upload = false;
  }
}

async function handleKnowledgeFileChange(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";

  if (!files.length) {
    return;
  }

  loading.importing = true;
  try {
    const payload = [];
    for (const file of files) {
      payload.push({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentText: shouldReadAsText(file) ? await readFileAsText(file) : ""
      });
    }

    await importKnowledgeFiles(payload);
    await refreshKnowledge();
    ElMessage.success(`已导入 ${files.length} 份知识文档`);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "导入知识文档失败"));
  } finally {
    loading.importing = false;
  }
}

async function handleDeleteKnowledgeDocument(documentId) {
  try {
    await deleteKnowledgeDocument(documentId);
    await refreshKnowledge();
    ElMessage.success("文档已删除");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "删除文档失败"));
  }
}

async function handleClearKnowledge() {
  loading.importing = true;
  try {
    await clearKnowledgeDocuments();
    await refreshKnowledge();
    ElMessage.success("知识库已清空");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "清空知识库失败"));
  } finally {
    loading.importing = false;
  }
}

async function handleActivateAgent(agentId) {
  try {
    await activateAgent(agentId);
    await Promise.all([refreshWorkspace(), refreshAgents()]);
    ElMessage.success("已切换学习智能体");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "切换智能体失败"));
  }
}

async function handleDetectModel() {
  try {
    const data = await detectCurrentModel({
      baseUrl: settings.baseUrl,
      provider: settings.provider,
      modelId: settings.modelId
    });
    settings.provider = data.provider || settings.provider;
    settings.modelId = data.model || settings.modelId;
    ElMessage.success(data.message || "已识别当前模型");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "识别模型失败"));
  }
}

async function handleSaveSettings() {
  loading.settingsSave = true;
  try {
    const data = await saveRuntimeSettings({
      provider: settings.provider,
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      systemPrompt: settings.systemPrompt,
      modelId: settings.modelId
    });

    applyRuntime(data);
    await refreshWorkspace();
    ElMessage.success(data.message || "配置已保存");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "保存配置失败"));
  } finally {
    loading.settingsSave = false;
  }
}

async function handleTestConnection() {
  loading.settingsTest = true;
  try {
    const data = await testRuntimeSettings({
      provider: settings.provider,
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey || "",
      modelId: settings.modelId
    });
    ElMessage[data.success ? "success" : "warning"](data.message || "测试完成");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "测试连接失败"));
  } finally {
    loading.settingsTest = false;
  }
}

function resizeComposer() {
  const element = composerRef.value;
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
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

function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("zh-CN");
}

function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

onMounted(() => {
  loadInitialData();
});
</script>

<style scoped>
.study-shell {
  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(circle at top right, rgba(0, 95, 184, 0.12), transparent 24%),
    linear-gradient(135deg, #eef5ff 0%, #f7fbff 48%, #edf4ff 100%);
}

.side-nav {
  width: 80px;
  padding: 32px 0;
  background: #004a8f;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: #ffffff;
  color: #004a8f;
  font-weight: 800;
  box-shadow: 0 12px 24px rgba(0, 95, 184, 0.18);
  margin-bottom: 10px;
}

.nav-button {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #d6e8ff;
  font-size: 16px;
  cursor: pointer;
  transition: 0.2s ease;
}

.nav-button:hover,
.nav-button--active {
  background: #ffffff;
  color: #005fb8;
  box-shadow: 0 12px 24px rgba(0, 95, 184, 0.18);
}

.workspace-main {
  flex: 1;
  min-width: 0;
  padding: 0;
}

.page-view {
  min-height: 100vh;
  padding: 32px;
}

.page-view--chat {
  padding: 0;
}

.top-bar {
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #dce8f5;
  backdrop-filter: blur(10px);
}

.online-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #22c55e;
}

.sub-copy,
.page-header p,
.toolbar-copy,
.document-card p,
.status-item p,
.empty-copy,
.hint-row {
  color: #64748b;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-pill,
.doc-badge,
.attachment-chip,
.attachment-label,
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
}

.model-pill {
  background: #edf5ff;
  color: #005fb8;
}

.icon-button,
.primary-button,
.secondary-button,
.quick-chip,
.composer-attach,
.send-button,
.link-button {
  border: none;
  cursor: pointer;
  transition: 0.2s ease;
  font: inherit;
}

.icon-button,
.secondary-button,
.quick-chip {
  background: #ffffff;
  color: #475569;
  border: 1px solid #dbe5f0;
}

.icon-button,
.secondary-button {
  height: 40px;
  padding: 0 16px;
  border-radius: 14px;
}

.primary-button,
.send-button {
  background: linear-gradient(135deg, #005fb8, #0c78da);
  color: #ffffff;
}

.primary-button {
  height: 44px;
  padding: 0 18px;
  border-radius: 14px;
  font-weight: 700;
}

.primary-button--small {
  height: 38px;
  padding: 0 14px;
}

.link-button {
  background: transparent;
  color: #005fb8;
}

.page-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header--stacked {
  align-items: start;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.page-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.page-actions--text {
  color: #475569;
}

.chat-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  min-height: calc(100vh - 64px);
}

.chat-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 24px 32px 0;
}

.quick-chip {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
}

.quick-chip:hover {
  border-color: #9fc4ea;
  color: #005fb8;
}

.message-list {
  flex: 1;
  overflow: auto;
  padding: 24px 32px;
  display: grid;
  gap: 18px;
}

.message-row {
  display: flex;
}

.message-row--user {
  justify-content: flex-end;
}

.message-card {
  max-width: min(760px, 100%);
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid #dbe5f0;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
}

.message-row--user .message-card {
  background: linear-gradient(135deg, #005fb8, #0c78da);
  color: #ffffff;
  border-color: transparent;
}

.message-row--user .message-meta span,
.message-row--user .message-content {
  color: rgba(255, 255, 255, 0.88);
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  font-size: 12px;
}

.message-content {
  margin: 12px 0 0;
  line-height: 1.7;
  white-space: pre-wrap;
}

.attachment-chips,
.timeline-list,
.status-list,
.metric-list {
  display: grid;
  gap: 12px;
}

.attachment-chips {
  display: flex;
  flex-wrap: wrap;
  margin-top: 14px;
}

.doc-badge,
.attachment-chip,
.attachment-label {
  background: #f1f7ff;
  color: #005fb8;
}

.message-row--user .attachment-chip {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.timeline-item {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.24);
}

.timeline-dot {
  width: 12px;
  height: 12px;
  margin-top: 5px;
  border-radius: 999px;
  background: #cbd5e1;
}

.timeline-dot--completed {
  background: #22c55e;
}

.timeline-dot--running {
  background: #f59e0b;
}

.timeline-dot--queued {
  background: #94a3b8;
}

.composer-panel {
  padding: 20px 24px 24px;
  background: rgba(255, 255, 255, 0.84);
  border-top: 1px solid #dce8f5;
  backdrop-filter: blur(8px);
}

.composer-box {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border-radius: 26px;
  background: #f8fbff;
  border: 1px solid #dbe5f0;
}

.composer-attach {
  min-width: 96px;
  height: 48px;
  border-radius: 18px;
  background: #ffffff;
  color: #475569;
  border: 1px solid #dbe5f0;
}

.composer-input {
  width: 100%;
  min-height: 48px;
  max-height: 160px;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  font: inherit;
  line-height: 1.6;
  padding: 12px 4px;
}

.send-button {
  min-width: 96px;
  height: 48px;
  border-radius: 18px;
  font-weight: 700;
}

.hint-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  font-size: 12px;
}

.status-column {
  display: grid;
  gap: 16px;
  padding: 24px;
  border-left: 1px solid #dce8f5;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(10px);
}

.surface-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #dce8f5;
  border-radius: 24px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.card-head,
.status-item__head,
.document-card__head,
.document-meta,
.metric-row,
.agent-foot,
.settings-actions,
.inline-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-head {
  margin-bottom: 14px;
}

.card-head h3,
.document-card h3,
.agent-card h3,
.info-card h3 {
  margin: 0;
}

.status-item,
.mini-item {
  padding: 14px 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #e6eef8;
}

.status-badge--idle {
  background: #eef2f7;
  color: #64748b;
}

.status-badge--queued {
  background: #fff4d9;
  color: #a16207;
}

.status-badge--running {
  background: #e7f0ff;
  color: #005fb8;
}

.status-badge--completed {
  background: #e9f9ee;
  color: #15803d;
}

.mini-item,
.metric-row {
  font-size: 14px;
}

.empty-block,
.empty-card {
  text-align: center;
  color: #64748b;
}

.stats-grid,
.document-grid,
.agent-grid,
.settings-shell {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
}

.metric-card strong {
  display: block;
  margin-top: 14px;
  font-size: 34px;
}

.metric-card__title {
  font-size: 20px;
}

.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.search-input,
.text-input {
  width: 100%;
  height: 46px;
  border-radius: 14px;
  border: 1px solid #dbe5f0;
  background: #f8fbff;
  padding: 0 14px;
  font: inherit;
  outline: none;
}

.text-input--textarea {
  min-height: 140px;
  padding: 14px;
  resize: vertical;
}

.document-grid,
.agent-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.document-card,
.agent-card {
  display: grid;
  gap: 14px;
}

.document-meta {
  flex-wrap: wrap;
  color: #64748b;
  font-size: 12px;
}

.agent-card--active {
  border-color: #8fbdea;
  box-shadow: 0 18px 40px rgba(0, 95, 184, 0.12);
}

.agent-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.agent-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: #edf5ff;
  color: #005fb8;
  font-weight: 800;
}

.agent-foot {
  align-items: end;
}

.agent-foot span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.settings-shell {
  grid-template-columns: minmax(0, 1.2fr) 320px;
}

.settings-card,
.settings-side {
  display: grid;
  gap: 16px;
}

.field-block {
  display: grid;
  gap: 8px;
}

.field-block span {
  font-weight: 600;
}

.info-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.hidden-file-input {
  display: none;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 1200px) {
  .chat-grid,
  .settings-shell {
    grid-template-columns: 1fr;
  }

  .status-column {
    border-left: none;
    border-top: 1px solid #dce8f5;
  }
}

@media (max-width: 900px) {
  .study-shell {
    flex-direction: column;
  }

  .side-nav {
    width: 100%;
    padding: 16px;
    flex-direction: row;
    justify-content: center;
  }

  .brand-mark {
    margin-bottom: 0;
    margin-right: 12px;
  }

  .page-view,
  .top-bar,
  .quick-prompts,
  .message-list {
    padding-left: 20px;
    padding-right: 20px;
  }

  .top-bar,
  .page-header,
  .toolbar-card,
  .hint-row,
  .card-head,
  .status-item__head,
  .document-meta,
  .agent-foot,
  .settings-actions,
  .inline-field {
    flex-direction: column;
    align-items: flex-start;
  }

  .composer-box,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
