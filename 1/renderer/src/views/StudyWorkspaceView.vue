<template>
  <div class="study-shell" :class="{ 'study-shell--embedded': embedded }">
    <nav v-if="!embedded" class="side-nav">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="nav-icon nav-icon--brand">
          <path :d="brandIconPath" />
        </svg>
      </div>

      <button
        v-for="item in topNavItems"
        :key="item.key"
        type="button"
        class="nav-button"
        :class="{ 'nav-button--active': currentPage === item.key }"
        :title="item.label"
        @click="currentPage = item.key"
      >
        <svg viewBox="0 0 24 24" class="nav-icon">
          <path :d="item.iconPath" />
        </svg>
      </button>

      <div class="side-nav__spacer"></div>

      <button
        type="button"
        class="nav-button"
        :class="{ 'nav-button--active': currentPage === settingsNavItem.key }"
        :title="settingsNavItem.label"
        @click="currentPage = settingsNavItem.key"
      >
        <svg viewBox="0 0 24 24" class="nav-icon">
          <path :d="settingsNavItem.iconPath" />
        </svg>
      </button>
    </nav>

    <div class="workspace-main">
      <section class="page-view page-view--chat" :class="{ active: currentPage === 'chat' }">
        <header class="top-bar">
          <div class="top-bar__title">
            <span class="online-dot"></span>
            <div>
              <h2>{{ chatTitleText }}</h2>
              <p>{{ chatSubtitleText }}</p>
            </div>
          </div>

          <div class="top-bar__actions">
            <span class="model-pill">{{ currentModelPillText }}</span>
            <button type="button" class="clear-button" :disabled="loading.chat" title="清空当前会话" @click="handleClearChat">
              <svg viewBox="0 0 24 24" class="action-icon">
                <path
                  d="M9 3.75h6a.75.75 0 0 1 .75.75v1.5h3a.75.75 0 0 1 0 1.5h-.53l-.84 10.06A2.25 2.25 0 0 1 15.14 19.5H8.86a2.25 2.25 0 0 1-2.24-1.94L5.78 7.5H5.25a.75.75 0 0 1 0-1.5h3V4.5A.75.75 0 0 1 9 3.75Zm.75 2.25h4.5v-.75h-4.5V6Zm-.5 3.75a.75.75 0 0 0-1.5 0v5.25a.75.75 0 0 0 1.5 0V9.75Zm4 0a.75.75 0 0 0-1.5 0v5.25a.75.75 0 0 0 1.5 0V9.75Zm2.5-.75a.75.75 0 0 0-.75.75v5.25a.75.75 0 0 0 1.5 0V9.75a.75.75 0 0 0-.75-.75Z"
                />
              </svg>
            </button>
          </div>
        </header>

        <div class="chat-layout">
          <ChatHistoryPanel
            :sessions="workspace.sessions"
            :active-session-id="workspace.activeSessionId"
            :loading="loading.workspace || loading.send || loading.chat"
            @create-session="handleCreateSession"
            @select-session="handleSelectSession"
            @rename-session="handleRenameSession"
            @delete-session="handleDeleteSession"
          />

          <div class="chat-column">
            <ChatPane
              ref="chatPaneRef"
              :quick-prompts="quickPrompts"
              :messages="messages"
              :loading-send="loading.send"
              :workspace-loading="loading.workspace"
              :active-agent-name="activeAgent?.name || ''"
              :render-message-content="renderMessageContent"
              :render-citations="renderCitations"
              :format-message-time="formatMessageTime"
              @select-prompt="composerText = $event"
            />

            <ComposerPanel
              ref="composerPanelRef"
              v-model="composerText"
              :loading-send="loading.send"
              :loading-upload="loading.upload"
              :status-text="chatStatusText"
              :pending-attachments="pendingAttachments"
              @attach="triggerChatFilePicker"
              @send="handleSendMessage"
            />
          </div>

          <StatusPanel :cards="statusCards" />
        </div>
      </section>

      <section class="page-view page-view--standard" :class="{ active: currentPage === 'kb' }">
        <KnowledgeList
          v-model:search="knowledgeSearch"
          :stats="knowledgeStats"
          :summary-text="knowledgeSummaryText"
          :documents="filteredKnowledgeDocuments"
          :importing="loading.importing"
          :folder-open-icon-path="folderOpenIconPath"
          :format-size="formatSize"
          :format-date="formatDate"
          @import="triggerKnowledgeFilePicker"
          @clear="handleClearKnowledge"
          @delete="handleDeleteKnowledgeDocument"
        />
      </section>

      <section class="page-view page-view--standard" :class="{ active: currentPage === 'settings' }">
        <SettingsForm
          ref="settingsFormRef"
          :settings="settingsDraft"
          :loading-save="loading.settingsSave"
          :loading-test="loading.settingsTest"
          :runtime-status-text="settingsRuntimeStatusText"
          :model-help-text="settingsModelHelpText"
          :storage-text="settingsStorageText"
          :templates="providerTemplates"
          :recent-models="recentSuccessfulModels"
          :connection-history="connectionHistory"
          :available-models="availableRemoteModels"
          @detect="handleDetectModel"
          @save="handleSaveSettings"
          @test="handleTestConnection"
          @apply-template="handleApplyTemplate"
          @select-recent-model="handleSelectRecentModel"
          @select-available-model="handleSelectAvailableModel"
          @export-config="handleExportConfig"
          @import-config="handleImportConfig"
          @clear-history="handleClearHistory"
        />
      </section>

      <section class="page-view page-view--standard" :class="{ active: currentPage === 'market' }">
        <div class="page-header">
          <div>
            <h1>智能体市场</h1>
            <p>可切换不同学习智能体，聊天页会联动当前角色。</p>
          </div>
          <div class="market-active-text">当前激活：<span>{{ activeAgent?.name || "默认学习助手" }}</span></div>
        </div>

        <div class="agent-grid">
          <article
            v-for="agent in marketAgents"
            :key="agent.id"
            class="surface-card market-card"
            :class="{ 'market-card--active': activeAgent?.id === agent.id }"
          >
            <div class="market-card__top">
              <div class="market-card__icon" :class="getAgentAccentClass(agent)">{{ getAgentDisplayLetter(agent) }}</div>
              <span class="market-card__badge" :class="{ 'market-card__badge--active': activeAgent?.id === agent.id }">
                {{ activeAgent?.id === agent.id ? "当前使用中" : "可切换" }}
              </span>
            </div>
            <h4>{{ agent.name }}</h4>
            <p class="market-card__subtitle">{{ getAgentTitle(agent) }}</p>
            <p class="market-card__description">{{ getAgentDescription(agent) }}</p>
            <p class="market-card__specialty">{{ getAgentSpecialty(agent) }}</p>
            <button
              type="button"
              class="market-card__button"
              :class="{ 'market-card__button--active': activeAgent?.id === agent.id }"
              :disabled="activeAgent?.id === agent.id || loading.agentSwitch"
              @click="handleActivateAgent(agent.id)"
            >
              {{ activeAgent?.id === agent.id ? "已激活" : switchingAgentId === agent.id ? "切换中" : "切换到该智能体" }}
            </button>
          </article>
        </div>
      </section>

      <section class="page-view page-view--standard" :class="{ active: currentPage === 'analytics' }">
        <AnalyticsView />
      </section>
    </div>

    <input ref="chatFileInputRef" type="file" class="hidden-file-input" multiple @change="handleChatFileChange" />
    <input ref="knowledgeFileInputRef" type="file" class="hidden-file-input" multiple @change="handleKnowledgeFileChange" />
    <input ref="configImportInputRef" type="file" accept=".json" class="hidden-file-input" @change="handleConfigFileChange" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import ChatPane from "@/components/workspace/ChatPane.vue";
import ChatHistoryPanel from "@/components/workspace/ChatHistoryPanel.vue";
import ComposerPanel from "@/components/workspace/ComposerPanel.vue";
import KnowledgeList from "@/components/workspace/KnowledgeList.vue";
import SettingsForm from "@/components/workspace/SettingsForm.vue";
import StatusPanel from "@/components/workspace/StatusPanel.vue";
import AnalyticsView from "@/views/AnalyticsView.vue";
import { useRuntimeSubscription } from "@/composables/useRuntimeSubscription.js";
import {
  activateAgent,
  clearChatSession,
  clearConnectionHistory,
  clearKnowledgeDocuments,
  createChatSession,
  deleteChatSession,
  deleteKnowledgeDocument,
  detectCurrentModel,
  exportModelConfig,
  fetchAgents,
  fetchChatSessionDetail,
  fetchConnectionHistory,
  fetchKnowledgeBases,
  fetchKnowledgeDocuments,
  fetchProviderTemplates,
  fetchRecentSuccessfulModels,
  fetchRuntimeSettings,
  fetchWorkspace,
  importKnowledgeFiles,
  importModelConfig,
  renameChatSession,
  saveRuntimeSettings,
  sendChatMessage,
  streamChatMessage,
  testRuntimeSettings,
  uploadChatAttachment
} from "@/services/api.js";
import { createEmptyRuntimeDraft, useRuntimeStore } from "@/stores/runtime.js";
import {
  formatDate,
  formatMessageTime,
  formatSize,
  getAgentAccentClass,
  getAgentDescription,
  getAgentDisplayLetter,
  getAgentSpecialty,
  getAgentTitle,
  inferMessageSource,
  readFileAsBase64,
  readFileAsText,
  renderCitations,
  renderMessageContent,
  shouldReadAsText
} from "@/utils/workspaceFormatters.js";

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  },
  lockedPage: {
    type: String,
    default: ""
  }
});

const brandIconPath =
  "M9.5 3.75c-2.35 0-4.25 1.9-4.25 4.25v1.03a3.25 3.25 0 0 0-.97 5.53A4.25 4.25 0 0 0 8.5 21h1.75A2 2 0 0 0 12 19.97A2 2 0 0 0 13.75 21h1.75a4.25 4.25 0 0 0 4.22-3.44a3.25 3.25 0 0 0-.97-5.53V8c0-2.35-1.9-4.25-4.25-4.25c-1.1 0-2.1.41-2.87 1.08A4.23 4.23 0 0 0 9.5 3.75ZM9 8.25c.41 0 .75.34.75.75v6a.75.75 0 0 1-1.5 0V9c0-.41.34-.75.75-.75Zm6 0c.41 0 .75.34.75.75v6a.75.75 0 0 1-1.5 0V9c0-.41.34-.75.75-.75ZM12 6.75c.41 0 .75.34.75.75v9a.75.75 0 0 1-1.5 0v-9c0-.41.34-.75.75-.75Z";

const iconPaths = {
  chat:
    "M4.5 5.25A2.25 2.25 0 0 1 6.75 3h10.5a2.25 2.25 0 0 1 2.25 2.25v8.25a2.25 2.25 0 0 1-2.25 2.25H10.7l-3.98 3.1A.75.75 0 0 1 5.5 18.2v-2.45A2.25 2.25 0 0 1 3.75 13.5V5.25A.75.75 0 0 1 4.5 5.25Z",
  book:
    "M6 3.75A2.25 2.25 0 0 0 3.75 6v11.25c0 1.24 1.01 2.25 2.25 2.25h12a.75.75 0 0 0 .75-.75V6A2.25 2.25 0 0 0 16.5 3.75H6Zm1.5 2.25h7.5a.75.75 0 0 1 0 1.5H7.5a.75.75 0 0 1 0-1.5Zm0 3.75h7.5a.75.75 0 0 1 0 1.5H7.5a.75.75 0 0 1 0-1.5Z",
  store:
    "M4.37 4.5h15.26c.36 0 .67.26.74.62l.63 3.13a2.99 2.99 0 0 1-2.25 3.47v6.03a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-6.03A2.99 2.99 0 0 1 3 8.25l.63-3.13c.07-.36.38-.62.74-.62Zm2.38 7.5v5.25h10.5V12c-.4-.12-.78-.31-1.12-.56a3.72 3.72 0 0 1-4.13 0A3.72 3.72 0 0 1 7.87 12c-.34.25-.72.44-1.12.56Zm-1.88-6-.37 1.87a1.5 1.5 0 0 0 1.47 1.79c.76 0 1.39-.57 1.49-1.33l.3-2.33H4.87Zm4.4 0-.26 2.03a1.5 1.5 0 0 0 2.99 0L11.74 6H9.27Zm3.97 0 .26 2.03a1.5 1.5 0 0 0 2.99 0L16.23 6h-2.99Zm4.48 0-.3 2.33c.1.76.73 1.33 1.49 1.33a1.5 1.5 0 0 0 1.47-1.79L20.01 6h-2.29Z",
  settings:
    "M10.6 1.84a1 1 0 0 1 2.8 0l.23.87c.12.44.52.73.98.75c.52.02 1.03.12 1.51.3c.43.16.91.06 1.21-.27l.64-.68a1 1 0 0 1 2.42 1.4l-.45.78c-.23.4-.19.89.07 1.26c.3.42.53.89.68 1.39c.14.45.52.77.99.79l.97.04a1 1 0 0 1 .87 1.78l-.74.52c-.39.27-.56.75-.45 1.21c.06.25.09.51.09.77s-.03.52-.09.77c-.11.46.06.94.45 1.21l.74.52a1 1 0 0 1-.87 1.78l-.97.04c-.47.02-.85.34-.99.79c-.15.5-.38.97-.68 1.39c-.26.37-.3.86-.07 1.26l.45.78a1 1 0 0 1-1.62 1.18l-.64-.68c-.3-.33-.78-.43-1.21-.27c-.48.18-.99.28-1.51.3c-.46.02-.86.31-.98.75l-.23.87a1 1 0 0 1-2.8 0l-.23-.87c-.12-.44-.52-.73-.98-.75a5.6 5.6 0 0 1-1.51-.3c-.43-.16-.91-.06-1.21.27l-.64.68a1 1 0 0 1-1.62-1.18l.45-.78c.23-.4.19-.89-.07-1.26a5.58 5.58 0 0 1-.68-1.39a1.07 1.07 0 0 0-.99-.79l-.97-.04a1 1 0 0 1-.87-1.78l.74-.52c.39-.27.56-.75.45-1.21A3.4 3.4 0 0 1 5 12c0-.26.03-.52.09-.77c.11-.46-.06-.94-.45-1.21l-.74-.52a1 1 0 0 1 .87-1.78l.97-.04c.47-.02.85-.34.99-.79c.15-.5.38-.97.68-1.39c.26-.37.3-.86.07-1.26l-.45-.78a1 1 0 0 1 1.62-1.18l.64.68c.3.33.78.43 1.21.27c.48-.18.99-.28 1.51-.3c.46-.02.86-.31.98-.75l.23-.87ZM12 8.25A3.75 3.75 0 1 0 12 15.75A3.75 3.75 0 0 0 12 8.25Z",
  bookOpen:
    "M2.25 5.25A2.25 2.25 0 0 1 4.5 3h5.63c1.09 0 2.14.42 2.93 1.17A4.22 4.22 0 0 1 15.94 3h3.56a2.25 2.25 0 0 1 2.25 2.25v12a.75.75 0 0 1-.75.75h-4.31c-.87 0-1.71.31-2.36.88l-1.3 1.12a1.5 1.5 0 0 1-1.96 0l-1.3-1.12A3.6 3.6 0 0 0 7.41 18H3a.75.75 0 0 1-.75-.75v-12Zm9 1.22A2.99 2.99 0 0 0 10.13 6H4.5a.75.75 0 0 0-.75.75v9.75h3.66c1.31 0 2.57.47 3.55 1.32l.29.24V6.47Zm1.5 11.59 .29-.25a5.1 5.1 0 0 1 3.65-1.31h3.56V6.75A.75.75 0 0 0 19.5 6h-3.56a3 3 0 0 0-3 3v9.06Z",
  microchip:
    "M9 6.75A2.25 2.25 0 0 1 11.25 4.5h1.5A2.25 2.25 0 0 1 15 6.75v.75h1.5A2.25 2.25 0 0 1 18.75 9.75v1.5h.75a.75.75 0 0 1 0 1.5h-.75v1.5A2.25 2.25 0 0 1 16.5 16.5H15v.75a2.25 2.25 0 0 1-2.25 2.25h-1.5A2.25 2.25 0 0 1 9 17.25v-.75H7.5a2.25 2.25 0 0 1-2.25-2.25v-1.5H4.5a.75.75 0 0 1 0-1.5h.75v-1.5A2.25 2.25 0 0 1 7.5 7.5H9v-.75Zm2.25-.75a.75.75 0 0 0-.75.75V9h3V6.75a.75.75 0 0 0-.75-.75h-1.5Zm-3 3a.75.75 0 0 0-.75.75v4.5c0 .41.34.75.75.75h7.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 0-.75-.75h-7.5Zm3-6a.75.75 0 0 1 .75.75v1.5h-1.5v-1.5a.75.75 0 0 1 .75-.75Zm-4.5 3a.75.75 0 0 1 .75.75v1.5H6V6.75a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v1.5h-1.5V6.75a.75.75 0 0 1 .75-.75ZM6.75 16.5c.41 0 .75.34.75.75v1.5H6v-1.5c0-.41.34-.75.75-.75Zm10.5 0c.41 0 .75.34.75.75v1.5h-1.5v-1.5c0-.41.34-.75.75-.75Zm-6 1.5h1.5v1.5h-1.5V18Z",
  robot:
    "M10.5 2.25a.75.75 0 0 1 1.5 0v1.53h1.5a3.75 3.75 0 0 1 3.75 3.75v1.22h.75A2.25 2.25 0 0 1 20.25 11v5.25A2.25 2.25 0 0 1 18 18.5h-1.5v.75a.75.75 0 0 1-1.5 0v-.75h-6v.75a.75.75 0 0 1-1.5 0v-.75H6A2.25 2.25 0 0 1 3.75 16.25V11A2.25 2.25 0 0 1 6 8.75h.75V7.53a3.75 3.75 0 0 1 3.75-3.75H12V2.25ZM8.25 7.53v1.22h7.5V7.53c0-1.24-1.01-2.25-2.25-2.25h-3c-1.24 0-2.25 1.01-2.25 2.25ZM6 10.25a.75.75 0 0 0-.75.75v5.25c0 .41.34.75.75.75h12a.75.75 0 0 0 .75-.75V11a.75.75 0 0 0-.75-.75H6Zm2.25 2.25a1.13 1.13 0 1 1 0 2.25a1.13 1.13 0 0 1 0-2.25Zm7.5 0a1.13 1.13 0 1 1 0 2.25a1.13 1.13 0 0 1 0-2.25Zm-6 3.75a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Z",
  plug:
    "M8.25 3.75a.75.75 0 0 1 1.5 0v4.5H12v-4.5a.75.75 0 0 1 1.5 0v4.5h.75A2.25 2.25 0 0 1 16.5 10.5v1.5A4.5 4.5 0 0 1 12.75 16.43v3.82a.75.75 0 0 1-1.5 0v-3.82A4.5 4.5 0 0 1 7.5 12v-1.5a2.25 2.25 0 0 1 2.25-2.25h.75v-4.5Zm1.5 6a.75.75 0 0 0-.75.75V12a3 3 0 1 0 6 0v-1.5a.75.75 0 0 0-.75-.75h-4.5Z",
  folderOpen:
    "M2.25 6A2.25 2.25 0 0 1 4.5 3.75h4.03c.6 0 1.17.24 1.6.66l1.44 1.44c.14.14.33.22.53.22H19.5A2.25 2.25 0 0 1 21.75 8.3v7.2a2.25 2.25 0 0 1-2.25 2.25H5.12a2.25 2.25 0 0 1-2.17-2.84l1.52-5.47a2.25 2.25 0 0 1 2.17-1.66h12.62a.75.75 0 0 1 .72.95l-1.38 4.97a1.5 1.5 0 0 1-1.45 1.1H7.88a.75.75 0 0 0 0 1.5h8.7a2.25 2.25 0 0 0 2.17-1.66l1-3.59H6.63a.75.75 0 0 0-.72.55l-1.52 5.47a.75.75 0 0 0 .72.95H19.5a.75.75 0 0 0 .75-.75V8.3a.75.75 0 0 0-.75-.75H12.1a2.23 2.23 0 0 1-1.6-.66L9.05 5.45a.75.75 0 0 0-.52-.2H4.5A.75.75 0 0 0 3.75 6v.75h-1.5V6Z",
  chart:
    "M3 13.5a.75.75 0 0 1 .75.75V18a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 0-1.5H6v-3a.75.75 0 0 1 1.5 0v3h1.5v-5.25a.75.75 0 0 1 1.5 0v5.25H12v-8.25a.75.75 0 0 1 1.5 0v8.25h1.5v-3.75a.75.75 0 0 1 1.5 0v3.75H18a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 1 1.5 0V18A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-3.75A.75.75 0 0 1 3 13.5Z"
};

const folderOpenIconPath = iconPaths.folderOpen;

const navItems = [
  { key: "chat", label: "聊天", iconPath: iconPaths.chat },
  { key: "kb", label: "知识库", iconPath: iconPaths.book },
  { key: "market", label: "智能体", iconPath: iconPaths.store },
  { key: "analytics", label: "仪表盘", iconPath: iconPaths.chart },
  { key: "settings", label: "设置", iconPath: iconPaths.settings }
];

const quickPrompts = [
  "基于知识库生成今天的复习计划",
  "提炼最近资料中的 10 个核心概念",
  "从知识库生成一组模拟测试题",
  "把复杂内容总结成背诵提纲"
];

const runtimeStore = useRuntimeStore();
const {
  chatStatusText,
  chatSubtitleText,
  currentModelPillText,
  settingsModelHelpText,
  settingsRuntimeStatusText,
  settingsStorageText
} = storeToRefs(runtimeStore);

const currentPage = ref(props.lockedPage || "chat");
const chatPaneRef = ref(null);
const composerPanelRef = ref(null);
const chatFileInputRef = ref(null);
const knowledgeFileInputRef = ref(null);
const settingsFormRef = ref(null);
const configImportInputRef = ref(null);
const composerText = ref("");
const knowledgeSearch = ref("");
const switchingAgentId = ref("");
let activeStreamAbortController = null;

const loading = reactive({
  workspace: false,
  chat: false,
  send: false,
  upload: false,
  importing: false,
  agentSwitch: false,
  settingsSave: false,
  settingsTest: false
});

const workspace = reactive({
  activeAgent: null,
  agentCatalog: [],
  sessions: [],
  activeSessionId: "",
  activeSession: null
});

const settingsDraft = reactive(createEmptyRuntimeDraft());
const allAgents = ref([]);
const knowledgeBases = ref([]);
const knowledgeDocuments = ref([]);
const pendingAttachments = ref([]);
const messages = ref([]);
const providerTemplates = ref([]);
const recentSuccessfulModels = ref([]);
const connectionHistory = ref([]);
const availableRemoteModels = ref([]);

const activeAgent = computed(() => workspace.activeAgent);
const sessionAttachments = computed(() => workspace.activeSession?.attachments || []);
const topNavItems = computed(() => navItems.filter((item) => item.key !== "settings"));
const settingsNavItem = computed(() => navItems.find((item) => item.key === "settings") || navItems[0]);
const marketAgents = computed(() => allAgents.value.filter((agent) => !agent.isSystem));

const knowledgeStats = computed(() => {
  const totalBytes = knowledgeDocuments.value.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0);
  return {
    totalCount: knowledgeDocuments.value.length,
    totalSize: formatSize(totalBytes),
    latestName: knowledgeDocuments.value[0]?.name || "暂无文档"
  };
});

const filteredKnowledgeDocuments = computed(() => {
  const keyword = knowledgeSearch.value.trim().toLowerCase();
  if (!keyword) {
    return knowledgeDocuments.value;
  }

  return knowledgeDocuments.value.filter((doc) => doc.name.toLowerCase().includes(keyword));
});

const knowledgeSummaryText = computed(() => {
  if (!knowledgeDocuments.value.length) {
    return "当前暂无可用文档。";
  }

  if (knowledgeSearch.value.trim()) {
    return `共找到 ${filteredKnowledgeDocuments.value.length} 份文档`;
  }

  return `当前共 ${knowledgeDocuments.value.length} 份资料，覆盖 ${knowledgeBases.value.length} 个知识库`;
});

const chatTitleText = computed(() => `${activeAgent.value?.name || "默认学习助手"} · 学习空间`);

const statusCards = computed(() => {
  const active = activeAgent.value;
  return [
    {
      title: "知识库状态",
      content: knowledgeDocuments.value.length
        ? `已接入 ${knowledgeDocuments.value.length} 份文档，最近导入：${knowledgeDocuments.value[0].name}`
        : "尚未导入文档，聊天将仅基于通用学习策略回答。",
      iconPath: iconPaths.bookOpen,
      colorClass: "status-card__icon--blue"
    },
    {
      title: "当前模型",
      content: `${currentModelPillText.value}${runtimeStore.baseUrl ? ` · ${runtimeStore.normalizedBaseUrl}` : " · 未配置直连地址"}`,
      iconPath: iconPaths.microchip,
      colorClass: "status-card__icon--green"
    },
    {
      title: "工作智能体",
      content: active ? `${active.name} 已激活。${getAgentSpecialty(active)}` : "当前暂无激活智能体。",
      iconPath: iconPaths.robot,
      colorClass: "status-card__icon--orange"
    },
    {
      title: "接口接入",
      content: runtimeStore.runtimeStatusText,
      iconPath: iconPaths.plug,
      colorClass: "status-card__icon--slate"
    }
  ];
});

function mapSessionMessages(session) {
  return (session?.messages || []).map((item) => ({
    ...item,
    source: item.source || inferMessageSource(item, runtimeStore.apiConfigured),
    citations: item.citations || []
  }));
}

function syncSettingsDraft() {
  Object.assign(settingsDraft, runtimeStore.createDraft());
}

function buildSessionSummary(session) {
  const latestMessage = session?.messages?.[session.messages.length - 1];
  return {
    id: session.id,
    title: session.title || "新建对话",
    status: session.status,
    updatedAt: session.updatedAt,
    messageCount: session.messages?.length || 0,
    lastMessagePreview: latestMessage?.content?.slice(0, 60) || ""
  };
}

function syncSessionSummary(session) {
  if (!session?.id) {
    return;
  }

  const summary = buildSessionSummary(session);
  const nextSessions = workspace.sessions.filter((item) => item.id !== session.id);
  workspace.sessions = [summary, ...nextSessions].sort((left, right) => {
    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });
}

function applyActiveSession(session) {
  workspace.activeSessionId = session?.id || "";
  workspace.activeSession = session || null;
  messages.value = mapSessionMessages(session);
}

function appendStreamingMessages(startPayload) {
  const userMessage = {
    ...startPayload.userMessage,
    source: "local",
    citations: []
  };
  const assistantMessage = {
    ...startPayload.assistantMessage,
    content: "",
    citations: [],
    status: "streaming",
    source: ""
  };

  messages.value = [...messages.value, userMessage, assistantMessage];
  workspace.activeSessionId = startPayload.sessionId;
  workspace.activeSession = {
    ...(workspace.activeSession || { id: startPayload.sessionId, title: "新建对话", attachments: [], messages: [] }),
    id: startPayload.sessionId,
    messages: [...(workspace.activeSession?.messages || []), userMessage, assistantMessage]
  };
}

function updateStreamingAssistant(deltaPayload) {
  messages.value = messages.value.map((message) =>
    message.id === deltaPayload.assistantMessageId
      ? {
          ...message,
          content: deltaPayload.content,
          status: "streaming"
        }
      : message
  );
}

function applyWorkspace(data) {
  runtimeStore.setCurrentModel(data.currentModel || null);
  workspace.activeAgent = data.activeAgent || null;
  workspace.agentCatalog = data.agentCatalog || [];
  workspace.sessions = data.sessions || [];
  applyActiveSession(data.activeSession || null);
}

async function refreshRuntimeSettings() {
  const payload = await fetchRuntimeSettings();
  runtimeStore.applyPayload(payload);
  syncSettingsDraft();
  return payload;
}

const { start: startRuntimeSettingsSubscription } = useRuntimeSubscription(
  (payload) => {
    runtimeStore.applyPayload(payload);
    syncSettingsDraft();
  },
  () => {}
);

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
    runtimeStore.applyPayload(runtime);
    syncSettingsDraft();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "加载页面数据失败"));
  } finally {
    loading.workspace = false;
    nextTick(() => {
      composerPanelRef.value?.resizeComposer();
    });
  }
}

async function refreshWorkspace() {
  const currentSessionId = workspace.activeSessionId;
  const data = await fetchWorkspace();
  applyWorkspace(data);

  if (
    currentSessionId &&
    currentSessionId !== data.activeSessionId &&
    data.sessions?.some((session) => session.id === currentSessionId)
  ) {
    const session = await fetchChatSessionDetail(currentSessionId);
    applyActiveSession(session);
  }
}

async function refreshKnowledge() {
  const [docs, bases] = await Promise.all([fetchKnowledgeDocuments(), fetchKnowledgeBases()]);
  knowledgeDocuments.value = docs;
  knowledgeBases.value = bases;
}

function replaceAgentInList(agent) {
  if (!agent?.id) {
    return;
  }

  const nextAgents = [...allAgents.value];
  const index = nextAgents.findIndex((item) => item.id === agent.id);
  if (index >= 0) {
    nextAgents[index] = {
      ...nextAgents[index],
      ...agent
    };
  } else {
    nextAgents.push(agent);
  }

  allAgents.value = nextAgents;
}

async function ensureSessionId() {
  if (workspace.activeSessionId) {
    return workspace.activeSessionId;
  }

  const session = await createChatSession({});
  applyActiveSession(session);
  syncSessionSummary(session);
  return session.id;
}

async function handleCreateSession() {
  loading.workspace = true;
  try {
    const session = await createChatSession({});
    applyActiveSession(session);
    syncSessionSummary(session);
    pendingAttachments.value = [];
    composerText.value = "";
    nextTick(() => {
      composerPanelRef.value?.resizeComposer();
      chatPaneRef.value?.scrollToBottom();
    });
    ElMessage.success("已新建对话，并保存到历史记录");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "新建对话失败"));
  } finally {
    loading.workspace = false;
  }
}

async function handleSelectSession(sessionId) {
  if (!sessionId || sessionId === workspace.activeSessionId) {
    return;
  }

  loading.workspace = true;
  try {
    const session = await fetchChatSessionDetail(sessionId);
    applyActiveSession(session);
    pendingAttachments.value = [];
    nextTick(() => {
      chatPaneRef.value?.scrollToBottom();
    });
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "读取历史会话失败"));
  } finally {
    loading.workspace = false;
  }
}

async function handleRenameSession(session) {
  if (!session?.id) {
    return;
  }

  const title = window.prompt("请输入新的会话名称", session.title || "新建对话");
  if (title === null) {
    return;
  }

  const nextTitle = title.trim();
  if (!nextTitle || nextTitle === session.title) {
    return;
  }

  loading.workspace = true;
  try {
    const updatedSession = await renameChatSession(session.id, { title: nextTitle });
    syncSessionSummary(updatedSession);

    if (workspace.activeSessionId === updatedSession.id) {
      workspace.activeSession = {
        ...workspace.activeSession,
        title: updatedSession.title,
        updatedAt: updatedSession.updatedAt
      };
    }

    ElMessage.success("会话已重命名");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "重命名会话失败"));
  } finally {
    loading.workspace = false;
  }
}

async function handleDeleteSession(session) {
  if (!session?.id) {
    return;
  }

  const confirmed = window.confirm(`确认删除会话“${session.title || "新建对话"}”吗？`);
  if (!confirmed) {
    return;
  }

  const deletingActiveSession = session.id === workspace.activeSessionId;

  loading.workspace = true;
  try {
    const data = await deleteChatSession(session.id);
    workspace.sessions = data.sessions || [];

    if (deletingActiveSession) {
      applyActiveSession(data.activeSession || null);
    } else if (!workspace.sessions.some((item) => item.id === workspace.activeSessionId)) {
      applyActiveSession(data.activeSession || null);
    }

    nextTick(() => {
      chatPaneRef.value?.scrollToBottom();
    });
    ElMessage.success("会话已删除");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "删除会话失败"));
  } finally {
    loading.workspace = false;
  }
}

function triggerChatFilePicker() {
  chatFileInputRef.value?.click();
}

function triggerKnowledgeFilePicker() {
  knowledgeFileInputRef.value?.click();
}

async function handleClearChat() {
  if (!workspace.activeSessionId) {
    return;
  }

  loading.chat = true;
  try {
    const session = await clearChatSession(workspace.activeSessionId);
    workspace.activeSession = session;
    messages.value = mapSessionMessages(session);
    pendingAttachments.value = [];
    syncSessionSummary(session);
    ElMessage.success("当前会话已清空");
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
    const payload = {
      sessionId,
      content: composerText.value.trim() || "请结合我刚上传的资料给出分析。",
      attachmentIds: pendingAttachments.value.map((item) => item.id)
    };

    composerText.value = "";
    pendingAttachments.value = [];
    composerPanelRef.value?.resizeComposer();

    activeStreamAbortController?.abort();
    activeStreamAbortController = new AbortController();

    await streamChatMessage(payload, {
      signal: activeStreamAbortController.signal,
      onStart(startPayload) {
        appendStreamingMessages(startPayload);
        nextTick(() => {
          chatPaneRef.value?.scrollToBottom();
        });
      },
      onDelta(deltaPayload) {
        updateStreamingAssistant(deltaPayload);
        nextTick(() => {
          chatPaneRef.value?.scrollToBottom();
        });
      }
    });

    await refreshWorkspace();
    nextTick(() => {
      composerPanelRef.value?.resizeComposer();
      chatPaneRef.value?.scrollToBottom();
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    if (isTimeoutError(error)) {
      try {
        await refreshWorkspace();
      } catch {
        // Ignore secondary refresh failures.
      }
      ElMessage.warning("请求等待时间较长，已尝试同步最新会话内容。请先查看聊天区是否已经返回结果，不要重复发送同一个问题。");
      return;
    }

    try {
      await refreshWorkspace();
    } catch {
      // Ignore refresh failures after stream errors.
    }

    ElMessage.error(getErrorMessage(error, "发送消息失败"));
  } finally {
    activeStreamAbortController = null;
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
      let contentText;
      if (shouldReadAsText(file)) {
        contentText = await readFileAsText(file);
      } else {
        contentText = await readFileAsBase64(file);
      }

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
    workspace.activeSession = {
      ...(workspace.activeSession || {}),
      attachments: [...sessionAttachments.value, ...uploaded]
    };
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
      let contentText;
      if (shouldReadAsText(file)) {
        contentText = await readFileAsText(file);
      } else {
        contentText = await readFileAsBase64(file);
      }

      payload.push({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentText
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
  const nextAgent = allAgents.value.find((item) => item.id === agentId);
  if (!nextAgent || loading.agentSwitch) {
    return;
  }

  const previousAgent = workspace.activeAgent ? { ...workspace.activeAgent } : null;
  switchingAgentId.value = agentId;
  loading.agentSwitch = true;

  try {
    workspace.activeAgent = nextAgent;
    const activatedAgent = await activateAgent(agentId);
    workspace.activeAgent = activatedAgent || nextAgent;
    replaceAgentInList(activatedAgent || nextAgent);
    ElMessage.success("已切换学习智能体");
  } catch (error) {
    workspace.activeAgent = previousAgent;
    ElMessage.error(getErrorMessage(error, "切换智能体失败"));
  } finally {
    loading.agentSwitch = false;
    switchingAgentId.value = "";
  }
}

async function handleDetectModel(payload) {
  try {
    const data = await detectCurrentModel({
      baseUrl: payload.baseUrl,
      apiKey: payload.apiKey,
      provider: payload.provider,
      modelId: payload.modelId
    });

    settingsDraft.provider = data.provider || payload.provider;
    settingsDraft.modelId = data.model || payload.modelId;
    availableRemoteModels.value = data.availableModels || [];
    await refreshConnectionData();
    ElMessage.success(data.message || "已识别当前模型");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "识别模型失败"));
  }
}

async function handleSaveSettings(payload) {
  loading.settingsSave = true;
  try {
    const data = await saveRuntimeSettings({
      provider: payload.provider,
      baseUrl: payload.baseUrl,
      apiKey: payload.apiKey,
      systemPrompt: payload.systemPrompt,
      modelId: payload.modelId
    });

    runtimeStore.applyPayload(data);
    syncSettingsDraft();
    await refreshWorkspace();
    ElMessage.success(data.message || "配置已保存");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "保存配置失败"));
  } finally {
    loading.settingsSave = false;
  }
}

async function handleTestConnection(payload) {
  loading.settingsTest = true;
  try {
    const data = await testRuntimeSettings({
      provider: payload.provider,
      baseUrl: payload.baseUrl,
      apiKey: payload.apiKey || "",
      modelId: payload.modelId
    });

    availableRemoteModels.value = data.availableModels || [];
    await refreshConnectionData();
    ElMessage[data.success ? "success" : "warning"](data.message || "测试完成");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "测试连接失败"));
  } finally {
    loading.settingsTest = false;
  }
}

function handleApplyTemplate(tpl) {
  settingsDraft.baseUrl = tpl.baseUrl;
  settingsDraft.modelId = tpl.defaultModel;
  settingsDraft.provider = tpl.id !== "custom" ? tpl.name : settingsDraft.provider;
}

function handleSelectRecentModel(item) {
  settingsDraft.provider = item.provider || settingsDraft.provider;
  settingsDraft.baseUrl = item.baseUrl || settingsDraft.baseUrl;
  settingsDraft.modelId = item.modelId || settingsDraft.modelId;
  ElMessage.success(`已切换至 ${item.provider} · ${item.modelId}`);
}

function handleSelectAvailableModel() {
  ElMessage.success(`已选择模型：${settingsDraft.modelId}`);
}

async function handleExportConfig() {
  try {
    const config = await exportModelConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("配置已导出");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "导出配置失败"));
  }
}

function handleImportConfig() {
  configImportInputRef.value?.click();
}

async function handleConfigFileChange(event) {
  const files = event.target.files;
  event.target.value = "";
  if (!files?.length) return;

  try {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(files[0]);
    });

    const config = JSON.parse(text);
    const result = await importModelConfig(config);
    runtimeStore.applyPayload(result);
    syncSettingsDraft();
    await refreshWorkspace();
    ElMessage.success(result.message || "配置已导入");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "导入配置失败，请检查文件格式"));
  }
}

async function handleClearHistory() {
  try {
    await clearConnectionHistory();
    connectionHistory.value = [];
    ElMessage.success("连接历史已清空");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "清空历史失败"));
  }
}

async function loadSettingsPageData() {
  try {
    const [templates, history, recent] = await Promise.all([
      fetchProviderTemplates(),
      fetchConnectionHistory(),
      fetchRecentSuccessfulModels()
    ]);
    providerTemplates.value = templates;
    connectionHistory.value = history;
    recentSuccessfulModels.value = recent;
  } catch {
    // Non-critical; settings page still works without this data.
  }
}

async function refreshConnectionData() {
  try {
    const [history, recent] = await Promise.all([
      fetchConnectionHistory(),
      fetchRecentSuccessfulModels()
    ]);
    connectionHistory.value = history;
    recentSuccessfulModels.value = recent;
  } catch {
    // Non-critical.
  }
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function isTimeoutError(error) {
  return error?.code === "ECONNABORTED" || String(error?.message || "").toLowerCase().includes("timeout");
}

onMounted(() => {
  loadInitialData();
  startRuntimeSettingsSubscription();
});

watch(
  () => props.lockedPage,
  (value) => {
    if (value && currentPage.value !== value) {
      currentPage.value = value;
    }
  },
  { immediate: true }
);

watch(currentPage, async (page) => {
  if (page !== "settings") {
    return;
  }

  try {
    await Promise.all([refreshRuntimeSettings(), loadSettingsPageData()]);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "读取配置文件失败"));
  }
});
</script>

<style scoped>
.study-shell {
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: transparent;
  color: var(--text-primary);
}

.study-shell--embedded {
  height: 100%;
}

.side-nav {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: 32px 0;
  background: var(--bg-nav);
  border-right: 1px solid var(--brand-blue-border);
  box-shadow: 0 18px 44px rgba(10, 50, 110, 0.14);
  backdrop-filter: blur(16px);
  color: var(--text-nav);
  z-index: 10;
}

.side-nav__spacer {
  flex: 1;
}

.brand-mark {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: var(--bg-surface);
  color: var(--brand-blue);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-card);
}

.nav-button {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--text-nav);
  cursor: pointer;
  transition: 0.2s ease-in-out;
}

.nav-button:hover,
.nav-button--active {
  background: var(--bg-surface);
  color: var(--text-nav-active);
  box-shadow: var(--shadow-card);
}

.nav-icon {
  width: 22px;
  height: 22px;
  fill: currentColor;
  filter: drop-shadow(0 0 10px rgba(146, 183, 255, 0.18));
}

.nav-icon--brand {
  width: 26px;
  height: 26px;
}

.workspace-main {
  flex: 1;
  height: 100vh;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.study-shell--embedded .workspace-main,
.study-shell--embedded .page-view--chat {
  height: 100%;
}

.page-view {
  display: none;
  animation: fadeIn 0.22s ease-in-out;
}

.page-view.active {
  display: flex;
}

.page-view--chat {
  height: 100vh;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.page-view--standard {
  min-height: 100vh;
  flex-direction: column;
  padding: 32px;
  overflow-y: auto;
}

.top-bar {
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-overlay);
  border-bottom: 1px solid var(--brand-blue-border);
  box-shadow: 0 16px 30px rgba(37, 87, 142, 0.06);
  backdrop-filter: blur(10px);
}

.top-bar__title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-bar__title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.top-bar__title p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.online-dot {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--dot-online);
}

.top-bar__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.model-pill {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--brand-blue-light);
  color: var(--color-info);
  font-size: 14px;
}

.clear-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.clear-button:hover {
  color: var(--brand-blue);
}

.action-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
  filter: drop-shadow(0 0 10px rgba(146, 183, 255, 0.16));
}

.chat-layout {
  flex: 1;
  height: calc(100vh - 64px);
  min-height: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 320px;
  overflow: hidden;
}

.chat-column {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  position: relative;
  overflow: hidden;
}

.page-header {
  margin-bottom: 32px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-header p {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.market-active-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.market-active-text span {
  font-weight: 700;
  color: var(--color-info);
}

.surface-card {
  background: var(--bg-overlay);
  border: 1px solid var(--border-primary);
  backdrop-filter: blur(10px);
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.market-card {
  padding: 24px;
  border-radius: 24px;
}

.market-card--active {
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.42) inset;
}

.market-card__top {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.market-card__icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 0 22px rgba(146, 183, 255, 0.12);
}

.market-card__icon--blue {
  background: var(--brand-blue-light);
  color: var(--brand-blue);
}

.market-card__icon--orange {
  background: rgba(251, 191, 36, 0.16);
  color: #b7791f;
}

.market-card__icon--emerald {
  background: rgba(16, 185, 129, 0.14);
  color: var(--color-success);
}

.market-card__badge {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--bg-surface-alt);
  color: var(--text-secondary);
  font-size: 12px;
}

.market-card__badge--active {
  background: var(--brand-blue-light);
  color: var(--color-info);
}

.market-card h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.market-card__subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.market-card__description {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
}

.market-card__specialty {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.7;
}

.market-card__button {
  width: 100%;
  margin-top: 24px;
  padding: 12px 16px;
  border-radius: 18px;
  border: 1px solid var(--brand-blue-border);
  background: var(--bg-surface);
  color: var(--color-info);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.market-card__button--active {
  background: var(--bg-avatar-user);
  border-color: var(--bg-avatar-user);
  color: var(--text-inverse);
}

.hidden-file-input {
  display: none;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1279px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .study-shell {
    flex-direction: column;
  }

  .side-nav {
    width: 100%;
    flex-direction: row;
    justify-content: center;
    gap: 16px;
    padding: 16px;
  }

  .side-nav__spacer {
    display: none;
  }

  .page-view--standard,
  .top-bar {
    padding-left: 20px;
    padding-right: 20px;
  }

  .top-bar,
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
