<template>
  <div>
    <h1 class="settings-title">API 接入配置</h1>
    <p class="settings-subtitle">如果填写 Base URL 和 API Key，聊天页会按 OpenAI 兼容格式请求 `chat/completions`。</p>

    <div class="surface-card settings-card">
      <form class="settings-form" @submit.prevent="emitWithSnapshot('save')">
        <!-- Provider Templates -->
        <div>
          <label class="field-label">供应商模板</label>
          <div class="template-row">
            <button
              v-for="tpl in templates"
              :key="tpl.id"
              type="button"
              class="template-chip"
              :class="{ 'template-chip--active': localSettings.baseUrl === tpl.baseUrl }"
              @click="emit('applyTemplate', tpl)"
            >{{ tpl.name }}</button>
          </div>
          <p class="field-help">点击模板自动填充 Base URL 和默认模型</p>
        </div>

        <!-- Recent Successful Models -->
        <div v-if="recentModels.length">
          <label class="field-label">最近成功模型</label>
          <div class="recent-list">
            <button
              v-for="(item, idx) in recentModels"
              :key="idx"
              type="button"
              class="recent-item"
              @click="emit('selectRecentModel', item)"
            >
              <span class="recent-item__name">{{ item.provider }} · {{ item.modelId }}</span>
              <span class="recent-item__url">{{ item.baseUrl }}</span>
            </button>
          </div>
        </div>

        <!-- Current Model -->
        <div>
          <label class="field-label">当前模型</label>
          <div class="field-inline">
            <select
              v-if="availableModels.length"
              v-model="localSettings.modelId"
              class="text-input text-input--select"
              @change="emitWithSnapshot('selectAvailableModel')"
            >
              <option v-for="m in availableModels" :key="m.id" :value="m.id">{{ m.id }}</option>
            </select>
            <input
              v-else
              v-model="localSettings.modelId"
              type="text"
              readonly
              class="text-input text-input--readonly"
              placeholder="保存或测试连接后自动读取当前模型"
            />
            <button type="button" class="secondary-button secondary-button--wide" @click="emitWithSnapshot('detect')">读取模型</button>
          </div>
          <p v-if="availableModels.length" class="field-help">共 {{ availableModels.length }} 个可用模型，可从下拉框自由切换</p>
          <p v-else class="field-help">{{ modelHelpText }}</p>
        </div>

        <!-- API Key -->
        <div>
          <label class="field-label">API Key</label>
          <input
            v-model="localSettings.apiKey"
            type="password"
            class="text-input"
            :placeholder="localSettings.apiKeyMasked || 'sk-xxxxxxxxxxxxxxxx'"
          />
        </div>

        <!-- API Base URL -->
        <div>
          <label class="field-label">API Base URL</label>
          <input v-model="localSettings.baseUrl" type="text" class="text-input" placeholder="https://api.example.com/v1" />
        </div>

        <!-- System Prompt -->
        <div>
          <label class="field-label">系统提示词</label>
          <textarea
            v-model="localSettings.systemPrompt"
            rows="4"
            class="text-input text-input--textarea"
            placeholder="定义你的学习助手角色、回答风格和约束。"
          ></textarea>
        </div>

        <!-- Info Grid -->
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
            <p class="settings-info-card__content">{{ runtimeStatusText }}</p>
            <p class="settings-info-card__path">{{ storageText }}</p>
          </div>
        </div>

        <!-- Connection History -->
        <div v-if="connectionHistory.length">
          <label class="field-label">连接历史</label>
          <div class="history-list">
            <div
              v-for="entry in connectionHistory.slice(0, 10)"
              :key="entry.id"
              class="history-item"
              :class="{ 'history-item--fail': !entry.success }"
            >
              <span class="history-item__status">{{ entry.success ? '✓' : '✗' }}</span>
              <span class="history-item__model">{{ entry.modelId }}</span>
              <span v-if="entry.latencyMs" class="history-item__latency">{{ entry.latencyMs }}ms</span>
              <span class="history-item__time">{{ formatHistoryTime(entry.createdAt) }}</span>
            </div>
          </div>
          <button type="button" class="link-button" @click="emit('clearHistory')">清空历史</button>
        </div>

        <!-- Action Buttons -->
        <div class="settings-actions settings-actions--multi">
          <button type="submit" class="primary-button primary-button--stretch" :disabled="loadingSave">保存配置</button>
          <button type="button" class="secondary-button secondary-button--strong" :disabled="loadingTest" @click="emitWithSnapshot('test')">
            测试连接
          </button>
          <button type="button" class="secondary-button secondary-button--small" title="导出配置" @click="emit('exportConfig')">
            <svg viewBox="0 0 24 24" class="btn-icon"><path d="M12 3.75a.75.75 0 0 1 .75.75v8.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V4.5a.75.75 0 0 1 .75-.75Z"/><path d="M4.5 14.25a.75.75 0 0 1 1.5 0v3.75a.75.75 0 0 0 .75.75h10.5a.75.75 0 0 0 .75-.75v-3.75a.75.75 0 0 1 1.5 0v3.75a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25v-3.75Z"/></svg>
          </button>
          <button type="button" class="secondary-button secondary-button--small" title="导入配置" @click="emit('importConfig')">
            <svg viewBox="0 0 24 24" class="btn-icon"><path d="M12 20.25a.75.75 0 0 1-.75-.75v-8.69l-2.22 2.22a.75.75 0 1 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06l-2.22-2.22v8.69a.75.75 0 0 1-.75.75Z"/><path d="M6.75 3.75a2.25 2.25 0 0 0-2.25 2.25v.75a.75.75 0 0 0 1.5 0V6a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75v.75a.75.75 0 0 0 1.5 0V6a2.25 2.25 0 0 0-2.25-2.25H6.75Z"/></svg>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from "vue";

const props = defineProps({
  settings: { type: Object, required: true },
  loadingSave: { type: Boolean, default: false },
  loadingTest: { type: Boolean, default: false },
  runtimeStatusText: { type: String, default: "" },
  modelHelpText: { type: String, default: "" },
  storageText: { type: String, default: "" },
  templates: { type: Array, default: () => [] },
  recentModels: { type: Array, default: () => [] },
  connectionHistory: { type: Array, default: () => [] },
  availableModels: { type: Array, default: () => [] }
});

const emit = defineEmits([
  "save", "detect", "test",
  "applyTemplate", "selectRecentModel", "selectAvailableModel",
  "exportConfig", "importConfig", "clearHistory"
]);

const localSettings = reactive({
  provider: "",
  baseUrl: "",
  apiKey: "",
  apiKeyMasked: "",
  systemPrompt: "",
  modelId: "",
  storageDirectory: "",
  storagePath: ""
});

watch(
  () => props.settings,
  (settings) => {
    Object.assign(localSettings, settings || {});
  },
  { immediate: true, deep: true }
);

function emitWithSnapshot(eventName) {
  emit(eventName, { ...localSettings });
}

function formatHistoryTime(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}
</script>

<style scoped>
.settings-title {
  margin: 0 0 12px;
  font-size: 30px;
  font-weight: 700;
  color: #1f2937;
}

.settings-subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: #6b7280;
}

.surface-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(208, 223, 243, 0.9);
  backdrop-filter: blur(10px);
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

.text-input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
  padding: 12px 16px;
  font-size: 14px;
  color: #1f2937;
  outline: none;
  box-sizing: border-box;
}

.text-input--readonly {
  background: #f3f4f6;
  color: #4b5563;
}

.text-input--select {
  appearance: auto;
  cursor: pointer;
}

.text-input--textarea {
  resize: vertical;
  min-height: 110px;
}

/* Templates */
.template-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-chip {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #4b5563;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: 0.15s ease;
}

.template-chip:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}

.template-chip--active {
  background: #dbeafe;
  border-color: #60a5fa;
  color: #2563eb;
  font-weight: 600;
}

/* Recent Models */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  transition: 0.15s ease;
  font-size: 13px;
}

.recent-item:hover {
  background: #f0fdf4;
  border-color: #86efac;
}

.recent-item__name {
  font-weight: 600;
  color: #1f2937;
}

.recent-item__url {
  color: #9ca3af;
  font-size: 12px;
}

/* Connection History */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 13px;
  color: #374151;
}

.history-item:hover {
  background: #f9fafb;
}

.history-item--fail {
  color: #9ca3af;
}

.history-item__status {
  width: 18px;
  text-align: center;
  font-weight: 700;
  color: #22c55e;
}

.history-item--fail .history-item__status {
  color: #ef4444;
}

.history-item__model {
  flex: 1;
  font-weight: 500;
}

.history-item__latency {
  color: #6b7280;
  font-size: 12px;
}

.history-item__time {
  color: #9ca3af;
  font-size: 12px;
}

.link-button {
  margin-top: 8px;
  padding: 0;
  border: none;
  background: none;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.link-button:hover {
  color: #2563eb;
}

/* Info Grid */
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

/* Actions */
.settings-actions {
  display: flex;
  gap: 12px;
}

.settings-actions--multi {
  flex-wrap: wrap;
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

.secondary-button--small {
  padding: 10px 14px;
}

.primary-button--stretch {
  flex: 1;
}

.btn-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
  display: block;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 900px) {
  .field-inline,
  .settings-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-info-grid {
    grid-template-columns: 1fr;
  }

  .settings-card {
    max-width: none;
  }
}
</style>
