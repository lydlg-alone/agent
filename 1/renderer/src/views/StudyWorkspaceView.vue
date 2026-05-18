<template>
  <div class="study-shell">
    <nav class="side-nav">
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
            <button type="button" class="clear-button" :disabled="loading.chat" title="娓呯┖鑱婂ぉ" @click="handleClearChat">
              <svg viewBox="0 0 24 24" class="action-icon">
                <path
                  d="M9 3.75h6a.75.75 0 0 1 .75.75v1.5h3a.75.75 0 0 1 0 1.5h-.53l-.84 10.06A2.25 2.25 0 0 1 15.14 19.5H8.86a2.25 2.25 0 0 1-2.24-1.94L5.78 7.5H5.25a.75.75 0 0 1 0-1.5h3V4.5A.75.75 0 0 1 9 3.75Zm.75 2.25h4.5v-.75h-4.5V6Zm-.5 3.75a.75.75 0 0 0-1.5 0v5.25a.75.75 0 0 0 1.5 0V9.75Zm4 0a.75.75 0 0 0-1.5 0v5.25a.75.75 0 0 0 1.5 0V9.75Zm2.5-.75a.75.75 0 0 0-.75.75v5.25a.75.75 0 0 0 1.5 0V9.75a.75.75 0 0 0-.75-.75Z"
                />
              </svg>
            </button>
          </div>
        </header>

        <div class="chat-layout">
          <div class="chat-column">
            <div class="chat-scroll-region scrollbar-thin">
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
              <template v-if="messages.length">
                <article
                  v-for="message in messages"
                  :key="message.id"
                  class="message-row"
                  :class="message.role === 'user' ? 'message-row--user' : 'message-row--assistant'"
                >
                  <div class="message-thread" :class="{ 'message-thread--user': message.role === 'user' }">
                    <div class="message-avatar" :class="message.role === 'user' ? 'message-avatar--user' : 'message-avatar--assistant'">
                      {{ message.role === "user" ? "我" : "A" }}
                    </div>

                    <div class="message-thread__body">
                      <div
                        class="message-bubble markdown-content"
                        :class="message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'"
                        v-html="renderMessageContent(message.content)"
                      ></div>

                      <div class="message-time" :class="{ 'message-time--user': message.role === 'user' }">
                        {{ formatMessageTime(message.createdAt) }}
                        <template v-if="message.source"> 路 {{ message.source }}</template>
                      </div>
                    </div>
                  </div>
                </article>

                <div v-if="loading.send" class="message-row message-row--assistant">
                  <div class="message-thread">
                    <div class="message-avatar message-avatar--assistant">A</div>
                    <div class="message-thread__body">
                      <div class="message-bubble chat-bubble-assistant typing-bubble">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-text">{{ activeAgent?.name || "瀛︿範鍔╂墜" }} 姝ｅ湪鏁寸悊绛旀</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <div v-else-if="!loading.workspace" class="empty-block">
                暂无消息，输入学习任务或上传资料开始。              </div>
            </div>

            </div>

            <footer class="composer-panel">
              <div class="composer-inner">
                <div class="composer-box">
                  <button type="button" class="composer-attach" :disabled="loading.upload" title="瀵煎叆鐭ヨ瘑鏂囨。" @click="triggerChatFilePicker">
                    <svg viewBox="0 0 24 24" class="composer-icon">
                      <path
                        d="M12 3.75a.75.75 0 0 1 .75.75v8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 1.06-1.06l2.72 2.72V4.5a.75.75 0 0 1 .75-.75Zm-6 12a.75.75 0 0 1 .75.75v.75c0 .41.34.75.75.75h9a.75.75 0 0 0 .75-.75v-.75a.75.75 0 0 1 1.5 0v.75A2.25 2.25 0 0 1 17.25 19.5h-9A2.25 2.25 0 0 1 6 17.25v-.75a.75.75 0 0 1 .75-.75Z"
                      />
                    </svg>
                  </button>

                  <textarea
                    ref="composerRef"
                    v-model="composerText"
                    class="composer-input"
                    rows="1"
                    placeholder="输入你的学习任务，例如：基于知识库生成 20 道测试题，并附上答案解析。"
                    @input="resizeComposer"
                  />

                  <button type="button" class="send-button" :disabled="loading.send" @click="handleSendMessage">
                    {{ loading.send ? "发送中" : "发送" }}
                  </button>
                </div>

                <div class="hint-row">
                  <span>Enter 鍙戦€侊紝Shift + Enter 鎹㈣</span>
                  <span>{{ chatStatusText }}</span>
                </div>

                <div v-if="pendingAttachments.length" class="pending-files">
                  <span class="pending-files__label">待发送附件</span>
                  <span v-for="attachment in pendingAttachments" :key="attachment.id" class="attachment-chip">
                    {{ attachment.name }}
                  </span>
                </div>
              </div>
            </footer>
          </div>

          <aside class="status-panel">
            <div class="status-panel__header">
              <h3>协同状态</h3>
              <p>展示模型、知识库和当前智能体状态。</p>
            </div>

            <div class="status-panel__body scrollbar-thin">
              <article v-for="card in statusCards" :key="card.title" class="surface-card status-card">
                <div class="status-card__head">
                  <div class="status-card__icon" :class="card.colorClass">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path :d="card.iconPath" />
                    </svg>
                  </div>
                  <h4>{{ card.title }}</h4>
                </div>
                <p>{{ card.content }}</p>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section class="page-view page-view--standard" :class="{ active: currentPage === 'kb' }">
        <div class="page-header">
          <div>
            <h1>知识库中心</h1>
            <p>导入学习资料后，聊天页会把这些文档元信息带给模型。</p>
          </div>

          <div class="page-actions">
            <button type="button" class="primary-button" :disabled="loading.importing" @click="triggerKnowledgeFilePicker">
              瀵煎叆鏈湴鏂囨。
            </button>
            <button type="button" class="secondary-button" :disabled="loading.importing" @click="handleClearKnowledge">
              清空知识库            </button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="surface-card stats-card">
            <p>鏂囨。鎬绘暟</p>
            <strong>{{ knowledgeStats.totalCount }}</strong>
          </div>
          <div class="surface-card stats-card">
            <p>绱澶у皬</p>
            <strong>{{ knowledgeStats.totalSize }}</strong>
          </div>
          <div class="surface-card stats-card">
            <p>最近导入</p>
            <strong class="stats-card__truncate">{{ knowledgeStats.latestName }}</strong>
          </div>
        </div>

        <div class="surface-card toolbar-card">
          <div class="toolbar-search">
            <span class="toolbar-search__icon">
              <svg viewBox="0 0 24 24" class="search-icon">
                <path
                  d="M10.5 4.5a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm0-1.5a7.5 7.5 0 1 0 4.73 13.32l3.22 3.21a.75.75 0 1 0 1.06-1.06l-3.21-3.22A7.5 7.5 0 0 0 10.5 3Z"
                />
              </svg>
            </span>
            <input v-model.trim="knowledgeSearch" type="text" class="search-input" placeholder="鎼滅储鏂囨。鍚嶇О" />
          </div>
          <div class="toolbar-summary">{{ knowledgeSummaryText }}</div>
        </div>

        <div v-if="!filteredKnowledgeDocuments.length" class="surface-card kb-empty">
          <div class="kb-empty__icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path :d="folderOpenIconPath" />
            </svg>
          </div>
          <h3>还没有学习资料</h3>
          <p>支持导入 PDF、Word、Markdown、TXT、PPT、CSV 等常见格式。</p>
        </div>

        <div v-else class="document-grid">
          <article v-for="doc in filteredKnowledgeDocuments" :key="doc.id" class="surface-card document-card">
            <div class="document-card__top">
              <div class="document-type-badge">{{ doc.sourceType.toUpperCase() }}</div>
              <button type="button" class="document-delete" title="鍒犻櫎鏂囨。" @click="handleDeleteKnowledgeDocument(doc.id)">
                鍒犻櫎
              </button>
            </div>
            <h3>{{ doc.name }}</h3>
            <p>{{ doc.summary || "已登记到知识库，可在聊天页直接引用。" }}</p>
            <div class="document-card__meta">
              <span>{{ doc.knowledgeBaseName || "默认知识库" }}</span>
              <span>{{ formatSize(doc.sizeBytes) }}</span>
              <span>{{ formatDate(doc.createdAt) }}</span>
            </div>
          </article>
        </div>
      </section>

      <section class="page-view page-view--standard" :class="{ active: currentPage === 'settings' }">
        <h1 class="settings-title">API 接入配置</h1>
        <p class="settings-subtitle">如果填写 Base URL 和 API Key，聊天页会按 OpenAI 兼容格式请求 `chat/completions`。</p>

        <div class="surface-card settings-card">
          <form class="settings-form" @submit.prevent="handleSaveSettings">
            <div>
              <label class="field-label">当前模型</label>
              <div class="field-inline">
                <input
                  v-model="settings.modelId"
                  type="text"
                  readonly
                  class="text-input text-input--readonly"
                  placeholder="保存或测试连接后自动读取当前模型"
                />
                <button type="button" class="secondary-button secondary-button--wide" @click="handleDetectModel">读取模型</button>
              </div>
              <p class="field-help">{{ settingsModelHelpText }}</p>
            </div>

            <div>
              <label class="field-label">API Key</label>
              <input
                v-model="settings.apiKey"
                type="password"
                class="text-input"
                :placeholder="settings.apiKeyMasked || 'sk-xxxxxxxxxxxxxxxx'"
              />
            </div>

            <div>
              <label class="field-label">API Base URL</label>
              <input v-model="settings.baseUrl" type="text" class="text-input" placeholder="https://api.example.com/v1" />
            </div>

            <div>
              <label class="field-label">系统提示词</label>
              <textarea
                v-model="settings.systemPrompt"
                rows="4"
                class="text-input text-input--textarea"
                placeholder="定义你的学习助手角色、回答风格和约束。"
              ></textarea>
            </div>

            <div class="settings-info-grid">
              <div class="surface-card settings-info-card">
                <p class="settings-info-card__title">接口约定</p>
                <p class="settings-info-card__content">
                  `POST /api/chat/messages`<br>
                  `GET /api/models/current`<br>
                  `POST /api/models/current`<br>
                  `POST /api/models/test`<br>
                  `POST /api/knowledge/import`<br>
                  `POST /api/agents/:id/activate`
                </p>
              </div>

              <div class="surface-card settings-info-card">
                <p class="settings-info-card__title">当前状态</p>
                <p class="settings-info-card__content">{{ settingsRuntimeStatusText }}</p>
                <p class="settings-info-card__path">{{ settingsStorageText }}</p>
              </div>
            </div>

            <div class="settings-actions">
              <button type="submit" class="primary-button primary-button--stretch" :disabled="loading.settingsSave">保存配置</button>
              <button type="button" class="secondary-button secondary-button--strong" :disabled="loading.settingsTest" @click="handleTestConnection">
                测试连接
              </button>
            </div>
          </form>
        </div>
      </section>

      <section class="page-view page-view--standard" :class="{ active: currentPage === 'market' }">
        <div class="page-header">
          <div>
            <h1>智能体市场</h1>
            <p>可切换不同学习智能体，聊天页会联动当前角色。</p>
          </div>
          <div class="market-active-text">褰撳墠婵€娲伙細<span>{{ activeAgent?.name || "榛樿瀛︿範鍔╂墜" }}</span></div>
        </div>

        <div class="agent-grid">
          <article v-for="agent in marketAgents" :key="agent.id" class="surface-card market-card" :class="{ 'market-card--active': activeAgent?.id === agent.id }">
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
              :disabled="activeAgent?.id === agent.id"
              @click="handleActivateAgent(agent.id)"
            >
              {{ activeAgent?.id === agent.id ? "已激活" : "切换到该智能体" }}
            </button>
          </article>
        </div>
      </section>
    </div>

    <input ref="chatFileInputRef" type="file" class="hidden-file-input" multiple @change="handleChatFileChange" />
    <input ref="knowledgeFileInputRef" type="file" class="hidden-file-input" multiple @change="handleKnowledgeFileChange" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
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
  subscribeRuntimeSettings,
  testRuntimeSettings,
  uploadChatAttachment
} from "@/services/api.js";

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
    "M2.25 6A2.25 2.25 0 0 1 4.5 3.75h4.03c.6 0 1.17.24 1.6.66l1.44 1.44c.14.14.33.22.53.22H19.5A2.25 2.25 0 0 1 21.75 8.3v7.2a2.25 2.25 0 0 1-2.25 2.25H5.12a2.25 2.25 0 0 1-2.17-2.84l1.52-5.47a2.25 2.25 0 0 1 2.17-1.66h12.62a.75.75 0 0 1 .72.95l-1.38 4.97a1.5 1.5 0 0 1-1.45 1.1H7.88a.75.75 0 0 0 0 1.5h8.7a2.25 2.25 0 0 0 2.17-1.66l1-3.59H6.63a.75.75 0 0 0-.72.55l-1.52 5.47a.75.75 0 0 0 .72.95H19.5a.75.75 0 0 0 .75-.75V8.3a.75.75 0 0 0-.75-.75H12.1a2.23 2.23 0 0 1-1.6-.66L9.05 5.45a.75.75 0 0 0-.52-.2H4.5A.75.75 0 0 0 3.75 6v.75h-1.5V6Z"
};

const folderOpenIconPath = iconPaths.folderOpen;

const navItems = [
  {
    key: "chat",
    label: "聊天",
    iconPath: iconPaths.chat
  },
  {
    key: "kb",
    label: "知识库",
    iconPath: iconPaths.book
  },
  {
    key: "market",
    label: "智能体",
    iconPath: iconPaths.store
  },
  {
    key: "settings",
    label: "设置",
    iconPath: iconPaths.settings
  }
];

const quickPrompts = [
  "基于知识库生成今天的复习计划",
  "提炼最近资料中的 10 个核心概念",
  "从知识库生成一组模拟测试题",
  "把复杂内容总结成背诵提纲"
];

const currentPage = ref("chat");
const composerRef = ref(null);
const chatFileInputRef = ref(null);
const knowledgeFileInputRef = ref(null);
const composerText = ref("");
const knowledgeSearch = ref("");
let stopRuntimeSettingsSubscription = null;

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
  modelId: "",
  storageDirectory: "",
  storagePath: ""
});

const allAgents = ref([]);
const knowledgeBases = ref([]);
const knowledgeDocuments = ref([]);
const pendingAttachments = ref([]);
const messages = ref([]);

const currentModel = computed(() => workspace.currentModel);
const activeAgent = computed(() => workspace.activeAgent);
const activeSession = computed(() => workspace.activeSession);
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

const chatSubtitleText = computed(() => {
  const baseUrl = normalizeBaseUrlDisplay(settings.baseUrl);
  return baseUrl ? `已连接 ${baseUrl}` : "当前使用本地模拟服务";
});

const currentModelPillText = computed(() => settings.modelId || currentModel.value?.modelId || "自动识别");

const chatStatusText = computed(() =>
  settings.baseUrl && (settings.apiKey || settings.apiKeyMasked)
    ? "已配置直连 API，发送消息会请求真实模型"
    : "未连接真实后端，当前使用本地模拟回复"
);

const runtimeStatusText = computed(() =>
  settings.baseUrl && (settings.apiKey || settings.apiKeyMasked)
    ? "已检测到 API 配置，页面将优先调用外部 AI 接口。"
    : "未填写 API Base URL 或 API Key，当前为本地演示模式。"
);

const settingsRuntimeStatusText = computed(() => {
  const lines = [runtimeStatusText.value];
  if (settings.provider || currentModel.value?.provider) {
    lines.push(`当前 Provider：${settings.provider || currentModel.value?.provider}`);
  }
  if (settings.modelId || currentModel.value?.modelId) {
    lines.push(`当前模型：${settings.modelId || currentModel.value?.modelId}`);
  }
  return lines.join(" ");
});

const settingsModelHelpText = computed(() =>
  currentModelPillText.value !== "自动识别"
    ? `当前已自动识别模型：${currentModelPillText.value}`
    : "不再手动选择模型，页面会从当前 AI 服务自动读取。"
);

const settingsStorageText = computed(() =>
  settings.storagePath ? `配置文件位置：${settings.storagePath}` : "配置将保存在系统文档目录下的 agent API 文件夹。"
);


const statusCards = computed(() => {
  const active = activeAgent.value;
  return [
    {
      title: "知识库状态",
      content: knowledgeDocuments.value.length
        ? `已接入 ${knowledgeDocuments.value.length} 份文档，最近导入：${knowledgeDocuments.value[0].name}`
        : "尚未导入文档，聊天将只基于通用学习策略回答。",
      iconPath: iconPaths.bookOpen,
      colorClass: "status-card__icon--blue"
    },
    {
      title: "当前模型",
      content: `${currentModelPillText.value}${settings.baseUrl ? ` · ${normalizeBaseUrlDisplay(settings.baseUrl)}` : " · 未配置直连地址"}`,
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
      content: runtimeStatusText.value,
      iconPath: iconPaths.plug,
      colorClass: "status-card__icon--slate"
    }
  ];
});

function applyWorkspace(data) {
  workspace.currentModel = data.currentModel || null;
  workspace.activeAgent = data.activeAgent || null;
  workspace.agentCatalog = data.agentCatalog || [];
  workspace.sessions = data.sessions || [];
  workspace.activeSessionId = data.activeSessionId || "";
  workspace.activeSession = data.activeSession || null;
  messages.value = (data.activeSession?.messages || []).map((item) => ({
    ...item,
    source: item.source || inferMessageSource(item)
  }));
}

function applyRuntime(payload) {
  const runtime = payload?.settings || payload || {};
  settings.provider = runtime.provider || payload?.currentModel?.provider || "";
  settings.baseUrl = runtime.baseUrl || "";
  settings.apiKey = "";
  settings.apiKeyMasked = runtime.apiKeyMasked || "";
  settings.systemPrompt = runtime.systemPrompt || "";
  settings.modelId = runtime.modelId || payload?.currentModel?.modelId || "";
  settings.storageDirectory = runtime.storageDirectory || "";
  settings.storagePath = runtime.storagePath || "";
}

async function refreshRuntimeSettings(options = {}) {
  const payload = await fetchRuntimeSettings();
  applyRuntime(payload);

  if (!options.preserveWorkspaceModel && payload?.currentModel) {
    workspace.currentModel = payload.currentModel;
  }

  return payload;
}

function startRuntimeSettingsSubscription() {
  stopRuntimeSettingsSubscription?.();
  stopRuntimeSettingsSubscription = subscribeRuntimeSettings(
    (payload) => {
      applyRuntime(payload);
      if (payload?.currentModel) {
        workspace.currentModel = payload.currentModel;
      }
    },
    () => {}
  );
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
    ElMessage.error(getErrorMessage(error, "鍔犺浇椤甸潰鏁版嵁澶辫触"));
  } finally {
    loading.workspace = false;
    nextTick(resizeComposer);
  }
}

async function refreshWorkspace() {
  applyWorkspace(await fetchWorkspace());
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
  messages.value = (session.messages || []).map((item) => ({
    ...item,
    source: item.source || inferMessageSource(item)
  }));
  return session.id;
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
    messages.value = (session.messages || []).map((item) => ({
      ...item,
      source: item.source || inferMessageSource(item)
    }));
    pendingAttachments.value = [];
    ElMessage.success("当前会话已清空");
    await refreshWorkspace();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "娓呯┖鑱婂ぉ澶辫触"));
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
    nextTick(() => {
      resizeComposer();
      scrollMessagesToBottom();
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      try {
        await refreshWorkspace();
      } catch {
        // Ignore secondary refresh failures.
      }
      ElMessage.warning("请求等待时间较长，已尝试同步最新会话内容。请先查看聊天区是否已经返回结果，不要重复发送同一个问题。");
      return;
    }

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
    workspace.activeSession = {
      ...(workspace.activeSession || {}),
      attachments: [...sessionAttachments.value, ...uploaded]
    };
    ElMessage.success(`已加入 ${uploaded.length} 个会话附件`);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "涓婁紶闄勪欢澶辫触"));
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
    ElMessage.error(getErrorMessage(error, "瀵煎叆鐭ヨ瘑鏂囨。澶辫触"));
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
    ElMessage.error(getErrorMessage(error, "鍒犻櫎鏂囨。澶辫触"));
  }
}

async function handleClearKnowledge() {
  loading.importing = true;
  try {
    await clearKnowledgeDocuments();
    await refreshKnowledge();
    ElMessage.success("鐭ヨ瘑搴撳凡娓呯┖");
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
    ElMessage.success("宸插垏鎹㈠涔犳櫤鑳戒綋");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "切换智能体失败"));
  }
}

async function handleDetectModel() {
  try {
    const data = await detectCurrentModel({
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
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

function scrollMessagesToBottom() {
  const element = document.querySelector(".chat-scroll-region");
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
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
    reader.onerror = () => reject(new Error(`璇诲彇鏂囦欢澶辫触锛?{file.name}`));
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

function normalizeBaseUrlDisplay(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function inferMessageSource(message) {
  if (message.role !== "assistant") {
    return "local";
  }

  return settings.baseUrl && (settings.apiKey || settings.apiKeyMasked) ? "api" : "mock";
}

function renderMessageContent(content) {
  const source = String(content || "").replace(/\r\n/g, "\n").trim();
  if (!source) {
    return "<p></p>";
  }

  const blocks = source.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return blocks.map(renderMarkdownBlock).join("");
}

function renderMarkdownBlock(block) {
  if (block.startsWith("```") && block.endsWith("```")) {
    const codeContent = block.replace(/^```[\w-]*\n?/, "").replace(/\n?```$/, "");
    return `<pre class="md-pre"><code>${escapeHtml(codeContent)}</code></pre>`;
  }

  const lines = block.split("\n");

  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    const items = lines
      .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
      .map((line) => `<li>${renderInlineMarkdown(line)}</li>`)
      .join("");
    return `<ul class="md-list">${items}</ul>`;
  }

  if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
    const items = lines
      .map((line) => line.replace(/^\s*\d+\.\s+/, "").trim())
      .map((line) => `<li>${renderInlineMarkdown(line)}</li>`)
      .join("");
    return `<ol class="md-list md-list--ordered">${items}</ol>`;
  }

  if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
    const level = Math.min((lines[0].match(/^#+/)?.[0].length || 1) + 2, 6);
    const text = lines[0].replace(/^#{1,3}\s+/, "");
    return `<h${level} class="md-heading">${renderInlineMarkdown(text)}</h${level}>`;
  }

  return `<p>${lines.map((line) => renderInlineMarkdown(line)).join("<br>")}</p>`;
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(String(text || ""));
  html = html.replace(/`([^`]+)`/g, "<code class=\"md-inline-code\">$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  return html;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAgentDisplayLetter(agent) {
  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "政";
  }
  if (role.includes("coding")) {
    return "码";
  }
  return "学";
}

function getAgentAccentClass(agent) {
  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "market-card__icon--orange";
  }
  if (role.includes("coding")) {
    return "market-card__icon--emerald";
  }
  return "market-card__icon--blue";
}

function getAgentTitle(agent) {
  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "政治知识梳理";
  }
  if (role.includes("coding")) {
    return "编程训练";
  }
  return "综合学习规划";
}

function getAgentDescription(agent) {
  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "适合主观题框架拆解、观点提炼和记忆提纲整理。";
  }
  if (role.includes("coding")) {
    return "适合代码解释、错误定位、练习设计和学习路线规划。";
  }
  return "适合日常问答、知识梳理、计划拆解和学习总结。";
}

function getAgentSpecialty(agent) {
  const scope = String(agent.knowledgeScope || "").trim();
  if (scope) {
    return `擅长范围：${scope}`;
  }

  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "擅长总结答题模板和论述结构。";
  }
  if (role.includes("coding")) {
    return "擅长定位错误原因并给出改写建议。";
  }
  return "擅长把模糊任务拆成清晰步骤。";
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

watch(currentPage, async (page) => {
  if (page !== "settings") {
    return;
  }

  try {
    await refreshRuntimeSettings();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "读取配置文件失败"));
  }
});

onBeforeUnmount(() => {
  stopRuntimeSettingsSubscription?.();
  stopRuntimeSettingsSubscription = null;
});
</script>

<style scoped>
:root {
  --main-blue: #005fb8;
  --deep-blue: #004a8f;
  --light-blue: #eef6ff;
  --panel-border: #dce8f5;
}

* {
  box-sizing: border-box;
}

.study-shell {
  min-height: 100vh;
  display: flex;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(0, 95, 184, 0.12), transparent 24%),
    linear-gradient(135deg, #eef5ff 0%, #f7fbff 48%, #edf4ff 100%);
  color: #1f2937;
}

.side-nav {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: 32px 0;
  background: #004a8f;
  color: #dbeafe;
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
  background: #ffffff;
  color: #004a8f;
  box-shadow: 0 12px 24px rgba(0, 95, 184, 0.18);
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
  color: inherit;
  cursor: pointer;
  transition: 0.2s ease-in-out;
}

.nav-button:hover,
.nav-button--active {
  background: #ffffff;
  color: var(--main-blue);
  box-shadow: 0 12px 24px rgba(0, 95, 184, 0.18);
}

.nav-icon {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.nav-icon--brand {
  width: 26px;
  height: 26px;
}

.workspace-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.page-view {
  display: none;
  animation: fadeIn 0.22s ease-in-out;
}

.page-view.active {
  display: flex;
}

.page-view--chat {
  height: 100%;
  min-height: 100vh;
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
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #dbeafe;
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
  color: #1f2937;
}

.top-bar__title p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.online-dot {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #22c55e;
}

.top-bar__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: #6b7280;
}

.model-pill {
  padding: 4px 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
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
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s ease;
}

.clear-button:hover {
  color: #2563eb;
}

.action-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.chat-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  overflow: hidden;
}

.chat-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.chat-scroll-region {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.quick-prompts {
  width: min(100%, 1320px);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 24px 32px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.quick-chip {
  padding: 10px 16px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s ease-in-out;
}

.quick-chip:hover {
  background: #eff6ff;
  color: #2563eb;
}

.message-list {
  min-height: 100%;
  padding: 8px 32px 220px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  scroll-padding-bottom: 220px;
}

.message-row {
  display: flex;
  width: min(100%, 1320px);
  margin: 0 auto;
}

.message-row--assistant {
  justify-content: flex-start;
}

.message-row--user {
  justify-content: flex-end;
}

.message-thread {
  max-width: min(896px, 100%);
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.message-thread--user {
  flex-direction: row-reverse;
}

.message-thread__body {
  max-width: min(768px, 100%);
}

.message-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
}

.message-avatar--assistant {
  background: #dbeafe;
  border: 1px solid #bfdbfe;
  color: #2563eb;
}

.message-avatar--user {
  background: #0f172a;
  color: #ffffff;
}

.message-bubble {
  padding: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  line-height: 1.75;
  font-size: 14px;
  word-break: break-word;
}

.chat-bubble-user {
  background: linear-gradient(135deg, #005fb8, #0c78da);
  color: #ffffff;
  border-radius: 18px 4px 18px 18px;
}

.chat-bubble-assistant {
  background: #ffffff;
  border: 1px solid #dbe5f0;
  border-radius: 4px 18px 18px 18px;
  color: #374151;
}

.message-time {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.message-time--user {
  text-align: right;
}

.typing-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-text {
  margin-left: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #60a5fa;
  animation: pulse 1.1s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.composer-panel {
  position: sticky;
  bottom: 0;
  z-index: 8;
  margin-top: auto;
  padding: 20px 32px 24px;
  background: linear-gradient(180deg, rgba(245, 249, 255, 0.05) 0%, rgba(255, 255, 255, 0.94) 20%, rgba(255, 255, 255, 0.98) 100%);
  border-top: 1px solid #dbeafe;
  box-shadow: 0 -10px 30px rgba(148, 163, 184, 0.08);
  backdrop-filter: blur(12px);
}

.composer-inner {
  max-width: 1320px;
  margin: 0 auto;
}

.composer-box {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  background: #f9fafb;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.composer-attach {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s ease;
}

.composer-attach:hover {
  color: #3b82f6;
}

.composer-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.composer-input {
  flex: 1;
  min-height: 48px;
  max-height: 160px;
  border: none;
  background: transparent;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #1f2937;
  outline: none;
  resize: none;
}

.send-button {
  min-width: 96px;
  height: 48px;
  flex-shrink: 0;
  border: none;
  border-radius: 18px;
  background: #005fb8;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.send-button:hover {
  background: #1d4ed8;
}

.hint-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  color: #6b7280;
}

.pending-files {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pending-files__label {
  font-size: 12px;
  color: #6b7280;
  align-self: center;
}

.status-panel {
  display: none;
  flex-direction: column;
  border-left: 1px solid #dbeafe;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(10px);
}

.status-panel__header {
  padding: 24px;
  border-bottom: 1px solid #dbeafe;
}

.status-panel__header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #374151;
}

.status-panel__header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.status-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.surface-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(10px);
}

.status-card {
  padding: 16px;
  border-radius: 16px;
}

.status-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-card__head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.status-card__icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.status-card__icon svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.status-card__icon--blue {
  background: #eff6ff;
  color: #2563eb;
}

.status-card__icon--green {
  background: #ecfdf5;
  color: #059669;
}

.status-card__icon--orange {
  background: #fff7ed;
  color: #ea580c;
}

.status-card__icon--slate {
  background: #f1f5f9;
  color: #475569;
}

.status-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #4b5563;
}

.page-header {
  margin-bottom: 32px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1,
.settings-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: #1f2937;
}

.page-header p,
.settings-subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 12px;
}

.primary-button,
.secondary-button {
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease-in-out;
}

.primary-button {
  padding: 10px 20px;
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
}

.primary-button:hover {
  background: #1d4ed8;
}

.secondary-button {
  padding: 10px 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #4b5563;
}

.secondary-button:hover {
  background: #f9fafb;
}

.secondary-button--wide {
  min-width: 110px;
}

.secondary-button--strong {
  padding-left: 24px;
  padding-right: 24px;
}

.primary-button--stretch {
  flex: 1;
}

.stats-grid {
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.stats-card {
  padding: 20px;
  border-radius: 20px;
}

.stats-card p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.stats-card strong {
  display: block;
  margin-top: 12px;
  font-size: 30px;
  font-weight: 700;
  color: #1f2937;
}

.stats-card__truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
}

.toolbar-card {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar-search {
  position: relative;
  flex: 1;
}

.toolbar-search__icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.search-input,
.text-input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
  padding: 12px 16px;
  font-size: 14px;
  color: #1f2937;
  outline: none;
}

.search-input {
  padding-left: 44px;
}

.text-input--readonly {
  background: #f3f4f6;
  color: #4b5563;
}

.text-input--textarea {
  resize: vertical;
  min-height: 110px;
}

.toolbar-summary {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
}

.kb-empty {
  padding: 56px;
  border: 2px dashed #d1d5db;
  border-radius: 24px;
  text-align: center;
  color: #6b7280;
}

.kb-empty__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
}

.kb-empty__icon svg {
  width: 28px;
  height: 28px;
  fill: currentColor;
}

.kb-empty h3 {
  margin: 0;
  font-size: 18px;
  color: #374151;
}

.kb-empty p {
  margin: 8px 0 0;
  font-size: 14px;
}

.document-grid,
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.document-card {
  padding: 20px;
  border-radius: 24px;
}

.document-card__top {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.document-type-badge {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.document-delete {
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 13px;
  cursor: pointer;
}

.document-delete:hover {
  color: #ef4444;
}

.document-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  word-break: break-all;
}

.document-card p {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: #6b7280;
}

.document-card__meta {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
}

.settings-title {
  margin-bottom: 12px;
}

.settings-subtitle {
  margin-bottom: 32px;
}

.settings-card {
  max-width: 768px;
  padding: 32px;
  border-radius: 24px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.field-inline {
  display: flex;
  gap: 12px;
}

.field-help {
  margin: 8px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.settings-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.settings-info-card {
  padding: 16px;
  border-radius: 16px;
}

.settings-info-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #374151;
}

.settings-info-card__content {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.8;
  color: #6b7280;
}

.settings-info-card__path {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #475569;
  word-break: break-all;
}

.settings-actions {
  display: flex;
  gap: 16px;
}

.market-active-text {
  font-size: 14px;
  color: #6b7280;
}

.market-active-text span {
  font-weight: 700;
  color: #2563eb;
}

.market-card {
  padding: 24px;
  border-radius: 24px;
}

.market-card--active {
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.8) inset;
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
}

.market-card__icon--blue {
  background: #dbeafe;
  color: #2563eb;
}

.market-card__icon--orange {
  background: #ffedd5;
  color: #ea580c;
}

.market-card__icon--emerald {
  background: #d1fae5;
  color: #059669;
}

.market-card__badge {
  padding: 4px 12px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 12px;
}

.market-card__badge--active {
  background: #dbeafe;
  color: #2563eb;
}

.market-card h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.market-card__subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: #6b7280;
}

.market-card__description {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: #4b5563;
}

.market-card__specialty {
  margin: 12px 0 0;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.7;
}

.market-card__button {
  width: 100%;
  margin-top: 24px;
  padding: 12px 16px;
  border-radius: 18px;
  border: 1px solid #bfdbfe;
  background: #ffffff;
  color: #2563eb;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.market-card__button--active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.empty-block {
  padding: 56px;
  text-align: center;
  color: #6b7280;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 12px;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 999px;
}

.markdown-content :deep(p),
.markdown-content :deep(ul),
.markdown-content :deep(ol),
.markdown-content :deep(pre),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5) {
  margin: 0;
}

.markdown-content :deep(p + p),
.markdown-content :deep(p + ul),
.markdown-content :deep(p + ol),
.markdown-content :deep(ul + p),
.markdown-content :deep(ol + p),
.markdown-content :deep(pre + p),
.markdown-content :deep(p + pre),
.markdown-content :deep(h3 + p),
.markdown-content :deep(h4 + p),
.markdown-content :deep(h5 + p) {
  margin-top: 12px;
}

.markdown-content :deep(.md-heading) {
  font-size: 16px;
  line-height: 1.5;
  font-weight: 700;
}

.markdown-content :deep(.md-list) {
  padding-left: 20px;
  display: grid;
  gap: 8px;
}

.markdown-content :deep(.md-inline-code) {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.08);
  font-family: "Consolas", "Courier New", monospace;
  font-size: 13px;
}

.chat-bubble-user :deep(.md-inline-code) {
  background: rgba(255, 255, 255, 0.18);
}

.markdown-content :deep(.md-pre) {
  overflow: auto;
  padding: 14px 16px;
  border-radius: 16px;
  background: #0f172a;
  color: #e2e8f0;
}

.markdown-content :deep(.md-pre code) {
  white-space: pre-wrap;
  font-family: "Consolas", "Courier New", monospace;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.hidden-file-input {
  display: none;
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

@keyframes pulse {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@media (min-width: 1280px) {
  .status-panel {
    display: flex;
  }
}

@media (max-width: 1279px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }

  .status-panel {
    display: flex;
    border-left: none;
    border-top: 1px solid #dbeafe;
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
  .quick-prompts,
  .message-list,
  .composer-panel,
  .top-bar {
    padding-left: 20px;
    padding-right: 20px;
  }

  .top-bar,
  .page-header,
  .toolbar-card,
  .hint-row,
  .field-inline,
  .settings-actions,
  .document-card__meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .composer-box,
  .stats-grid,
  .settings-info-grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .composer-box {
    gap: 8px;
  }

  .settings-card {
    max-width: none;
  }
}
</style>



