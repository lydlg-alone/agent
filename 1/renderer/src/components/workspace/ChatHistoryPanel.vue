<template>
  <aside class="history-panel">
    <div class="history-panel__header">
      <div>
        <h3>历史会话</h3>
        <p>新建对话会立即保存到历史列表。</p>
      </div>
      <button type="button" class="history-panel__create" :disabled="loading" @click="$emit('create-session')">
        新建对话
      </button>
    </div>

    <div class="history-panel__body scrollbar-thin">
      <article
        v-for="session in sessions"
        :key="session.id"
        class="history-item"
        :class="{ 'history-item--active': session.id === activeSessionId }"
      >
        <button
          type="button"
          class="history-item__select"
          :disabled="loading && session.id === activeSessionId"
          @click="$emit('select-session', session.id)"
        >
          <div class="history-item__meta">
            <strong>{{ session.title || "新建对话" }}</strong>
            <span>{{ formatRelativeTime(session.updatedAt) }}</span>
          </div>
          <p>{{ session.lastMessagePreview || "暂无消息" }}</p>
          <div class="history-item__footer">{{ session.messageCount || 0 }} 条消息</div>
        </button>

        <div class="history-item__actions">
          <button type="button" class="history-item__action" :disabled="loading" @click.stop="$emit('rename-session', session)">
            重命名
          </button>
          <button type="button" class="history-item__action history-item__action--danger" :disabled="loading" @click.stop="$emit('delete-session', session)">
            删除
          </button>
        </div>
      </article>

      <div v-if="!sessions.length" class="history-empty">
        还没有历史会话。
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  sessions: {
    type: Array,
    default: () => []
  },
  activeSessionId: {
    type: String,
    default: ""
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(["create-session", "select-session", "rename-session", "delete-session"]);

function formatRelativeTime(value) {
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
</script>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid #dbeafe;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
}

.history-panel__header {
  padding: 20px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-bottom: 1px solid #dbeafe;
}

.history-panel__header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.history-panel__header p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
}

.history-panel__create {
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 14px;
  background: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.history-panel__create:hover {
  background: #1d4ed8;
}

.history-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  padding: 14px;
  border: 1px solid #dbe5f0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  transition: 0.2s ease-in-out;
}

.history-item:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.history-item--active {
  border-color: #60a5fa;
  background: #eff6ff;
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.35) inset;
}

.history-item__select {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.history-item__meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.history-item__meta strong {
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
}

.history-item__meta span {
  flex-shrink: 0;
  font-size: 11px;
  color: #94a3b8;
}

.history-item p {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.history-item__footer {
  margin-top: 10px;
  font-size: 11px;
  color: #94a3b8;
}

.history-item__actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.history-item__action {
  flex: 1;
  border: 1px solid #dbe5f0;
  border-radius: 10px;
  background: #ffffff;
  padding: 8px 10px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: 0.2s ease;
}

.history-item__action:hover {
  border-color: #93c5fd;
  color: #2563eb;
}

.history-item__action--danger:hover {
  border-color: #fecaca;
  color: #dc2626;
}

.history-empty {
  padding: 32px 18px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 999px;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 1279px) {
  .history-panel {
    border-right: none;
    border-bottom: 1px solid #dbeafe;
  }
}
</style>
