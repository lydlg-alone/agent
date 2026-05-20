<template>
  <div ref="scrollRegionRef" class="chat-scroll-region scrollbar-thin">
    <div class="quick-prompts">
      <button
        v-for="prompt in quickPrompts"
        :key="prompt"
        type="button"
        class="quick-chip"
        @click="$emit('select-prompt', prompt)"
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
              {{ message.role === "user" ? "我" : "AI" }}
            </div>

            <div class="message-thread__body">
              <div
                class="message-bubble markdown-content"
                :class="message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'"
                v-html="renderMessageContent(message.content)"
              ></div>

              <div class="message-time" :class="{ 'message-time--user': message.role === 'user' }">
                {{ formatMessageTime(message.createdAt) }}
                <template v-if="message.source"> · {{ message.source }}</template>
              </div>

              <div
                v-if="message.role === 'assistant' && message.citations?.length"
                class="citation-section"
                v-html="renderCitations(message.citations)"
              ></div>
            </div>
          </div>
        </article>

        <div v-if="loadingSend && !messages.some((message) => message.status === 'streaming')" class="message-row message-row--assistant">
          <div class="message-thread">
            <div class="message-avatar message-avatar--assistant">AI</div>
            <div class="message-thread__body">
              <div class="message-bubble chat-bubble-assistant typing-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-text">{{ activeAgentName || "学习助手" }} 正在整理回答</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-else-if="!workspaceLoading" class="empty-block">
        暂无消息，输入学习任务或上传资料开始对话。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  quickPrompts: {
    type: Array,
    default: () => []
  },
  messages: {
    type: Array,
    default: () => []
  },
  loadingSend: {
    type: Boolean,
    default: false
  },
  workspaceLoading: {
    type: Boolean,
    default: false
  },
  activeAgentName: {
    type: String,
    default: ""
  },
  renderMessageContent: {
    type: Function,
    required: true
  },
  renderCitations: {
    type: Function,
    default: () => ""
  },
  formatMessageTime: {
    type: Function,
    required: true
  }
});

defineEmits(["select-prompt"]);

const scrollRegionRef = ref(null);

function scrollToBottom() {
  const element = scrollRegionRef.value;
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

defineExpose({
  scrollToBottom
});
</script>

<style scoped>
.chat-scroll-region {
  height: 100%;
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
  border: 1px solid var(--brand-blue-border);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s ease-in-out;
}

.quick-chip:hover {
  background: var(--brand-blue-light);
  color: var(--color-info);
}

.message-list {
  min-height: 100%;
  box-sizing: border-box;
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
  background: var(--bg-avatar-assistant);
  border: 1px solid var(--border-avatar-assistant);
  color: var(--text-avatar-assistant);
}

.message-avatar--user {
  background: var(--bg-avatar-user);
  color: var(--text-avatar-user);
}

.message-bubble {
  padding: 16px;
  box-shadow: var(--shadow-card);
  line-height: 1.75;
  font-size: 14px;
  word-break: break-word;
}

.chat-bubble-user {
  background: var(--bg-bubble-user);
  color: var(--text-bubble-user);
  border-radius: 18px 4px 18px 18px;
}

.chat-bubble-assistant {
  background: var(--bg-bubble-assistant);
  border: 1px solid var(--border-bubble-assistant);
  border-radius: 4px 18px 18px 18px;
  color: var(--text-bubble-assistant);
}

.message-time {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.message-time--user {
  text-align: right;
}

.citation-section {
  margin-top: 14px;
}

.typing-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-text {
  margin-left: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
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

.empty-block {
  padding: 56px;
  text-align: center;
  color: var(--text-secondary);
}

.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 999px;
}

/* ---- Markdown 内容样式（compat with marked output） ---- */
.markdown-content :deep(p),
.markdown-content :deep(ul),
.markdown-content :deep(ol),
.markdown-content :deep(pre),
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 0;
}

.markdown-content :deep(p + p),
.markdown-content :deep(p + ul),
.markdown-content :deep(p + ol),
.markdown-content :deep(ul + p),
.markdown-content :deep(ol + p),
.markdown-content :deep(pre + p),
.markdown-content :deep(p + pre),
.markdown-content :deep(h1 + p),
.markdown-content :deep(h2 + p),
.markdown-content :deep(h3 + p),
.markdown-content :deep(h4 + p),
.markdown-content :deep(h5 + p),
.markdown-content :deep(h6 + p) {
  margin-top: 12px;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-size: 16px;
  line-height: 1.5;
  font-weight: 700;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 20px;
  display: grid;
  gap: 8px;
}

.markdown-content :deep(code) {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 8px;
  background: var(--bg-inline-code);
  font-family: "Consolas", "Courier New", monospace;
  font-size: 13px;
}

.chat-bubble-user :deep(code) {
  background: var(--bg-inline-code-user);
}

.markdown-content :deep(pre) {
  overflow: auto;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--bg-code);
  color: var(--text-code);
}

.markdown-content :deep(pre code) {
  white-space: pre-wrap;
  font-family: "Consolas", "Courier New", monospace;
  background: transparent;
  padding: 0;
  border-radius: 0;
}

/* ---- 表格样式 ---- */
.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--border-subtle);
  text-align: left;
}

.markdown-content :deep(th) {
  background: var(--bg-surface-alt);
  font-weight: 700;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid var(--brand-blue);
  margin: 12px 0;
  padding: 4px 16px;
  color: var(--text-secondary);
}

.markdown-content :deep(a) {
  color: var(--color-info);
  text-decoration: underline;
}

/* ---- KaTeX 公式 ---- */
.markdown-content :deep(.katex) {
  color: var(--katex-color);
}

.markdown-content :deep(.katex-display) {
  margin: 16px 0;
  overflow-x: auto;
}

/* ---- 引用块 ---- */
.markdown-content :deep(.citation-block) {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg-citation);
  border: 1px solid var(--border-citation);
}

.markdown-content :deep(.citation-title) {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.markdown-content :deep(.citation-marker) {
  color: var(--color-info);
  font-weight: 700;
  margin-right: 6px;
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

@media (max-width: 900px) {
  .quick-prompts,
  .message-list {
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
