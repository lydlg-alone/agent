<template>
  <div class="settings-shell">
    <header class="settings-header">
      <h1 class="settings-title">API 接入配置</h1>
      <p class="settings-subtitle">
        填写 Base URL 和 API Key 后，聊天页会按 OpenAI 兼容格式请求 `chat/completions`。
      </p>
    </header>

    <section class="surface-card status-strip">
      <div class="status-summary">
        <div class="status-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A8.51 8.51 0 0 0 12 3.5Zm0 14.75A6.25 6.25 0 1 1 18.25 12 6.26 6.26 0 0 1 12 18.25Zm0-10.5A4.25 4.25 0 1 0 16.25 12 4.26 4.26 0 0 0 12 7.75Z"
            />
          </svg>
        </div>

        <div class="status-summary__body">
          <div class="status-summary__label">当前状态</div>
          <div class="status-summary__line">
            <span class="status-badge" :class="{ 'status-badge--dim': !runtimeStatusText }"></span>
            <span>{{ runtimeStatusText || "尚未检测到可用的 API 配置。" }}</span>
          </div>
        </div>
      </div>

      <div class="status-meta">
        <div class="status-meta__item">
          <span class="status-meta__label">Provider</span>
          <span class="status-meta__value">{{ activeProviderLabel }}</span>
        </div>
        <div class="status-meta__item">
          <span class="status-meta__label">当前模型</span>
          <span class="status-meta__value">{{ localSettings.modelId || "未设置" }}</span>
        </div>
        <div class="status-meta__item">
          <span class="status-meta__label">配置文件位置</span>
          <span class="status-meta__value status-meta__value--path">{{ storageText || "未配置" }}</span>
        </div>
      </div>
    </section>

    <section class="surface-card template-strip">
      <div class="template-strip__title">供应商模板</div>

      <div class="template-strip__row">
        <button
          v-for="tpl in templates"
          :key="tpl.id"
          type="button"
          class="template-tile"
          :class="[
            `template-tile--${resolveTemplateBrand(tpl)}`,
            { 'template-tile--active': activeTemplateId === tpl.id }
          ]"
          @click="handleApplyTemplate(tpl)"
        >
          <span class="template-tile__icon" :class="`template-tile__icon--${resolveTemplateBrand(tpl)}`">
            <img
              v-if="providerIconMap[resolveTemplateBrand(tpl)]"
              :src="providerIconMap[resolveTemplateBrand(tpl)]"
              :alt="`${tpl.name} 图标`"
              class="template-tile__image"
            />
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M10.75 4.5a.75.75 0 0 1 1.5 0v4.75H17a.75.75 0 0 1 0 1.5h-4.75v4.75a.75.75 0 0 1-1.5 0v-4.75H6a.75.75 0 0 1 0-1.5h4.75V4.5Z"
              />
              <path
                d="M6.5 3.75h11A2.75 2.75 0 0 1 20.25 6.5v11A2.75 2.75 0 0 1 17.5 20.25h-11A2.75 2.75 0 0 1 3.75 17.5v-11A2.75 2.75 0 0 1 6.5 3.75Zm0 1.5a1.25 1.25 0 0 0-1.25 1.25v11A1.25 1.25 0 0 0 6.5 18.75h11a1.25 1.25 0 0 0 1.25-1.25v-11A1.25 1.25 0 0 0 17.5 5.25h-11Z"
              />
            </svg>
          </span>
          <span class="template-tile__name">{{ tpl.name }}</span>
        </button>
      </div>

      <div class="template-strip__hint">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.75A9.25 9.25 0 1 0 21.25 12 9.26 9.26 0 0 0 12 2.75Zm0 14a1.12 1.12 0 1 1 1.12-1.12A1.12 1.12 0 0 1 12 16.75Zm1.17-4.82a.75.75 0 0 0-.42.67v.41a.75.75 0 0 1-1.5 0v-.41A2.25 2.25 0 0 1 12.51 10a1.06 1.06 0 1 0-1.75-.81.75.75 0 0 1-1.46-.34A2.56 2.56 0 1 1 13.17 11.93Z"
          />
        </svg>
        <span>点击模板会自动填充 Base URL 和默认模型。</span>
      </div>
    </section>

    <section class="surface-card settings-workbench">
      <aside class="settings-aside">
        <section class="prompt-panel">
          <div class="prompt-panel__head">
            <h2>系统提示词</h2>
            <p>定义学习助手的角色、回答风格、约束条件和输出边界。</p>
          </div>

          <textarea
            v-model="localSettings.systemPrompt"
            class="prompt-panel__textarea"
            rows="18"
            placeholder="例如：你是一个严谨的学习助手。回答前先明确前提，再给出结构化结论，并在信息不足时直接指出不确定性。"
          ></textarea>
        </section>
      </aside>

      <div class="settings-content">
        <section class="content-panel">
          <div class="content-panel__head">
            <h2>当前模型</h2>
            <button
              type="button"
              class="ghost-button"
              :disabled="loadingSave || loadingTest"
              @click="emitWithSnapshot('detect')"
            >
              读取模型
            </button>
          </div>

          <div class="field-grid">
            <div class="field-block">
              <label class="field-label">API Key</label>
              <div class="input-wrap">
                <input
                  v-model="localSettings.apiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  class="text-input text-input--with-action"
                  :placeholder="localSettings.apiKeyMasked || 'sk-xxxxxxxxxxxxxxxx'"
                />
                <button
                  type="button"
                  class="input-action"
                  :title="showApiKey ? '隐藏 API Key' : '显示 API Key'"
                  @click="showApiKey = !showApiKey"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 5.5c4.86 0 8.59 3.1 10 6.5-1.41 3.4-5.14 6.5-10 6.5S3.41 15.4 2 12C3.41 8.6 7.14 5.5 12 5.5Zm0 11.5c3.69 0 6.65-2.21 8.15-5-1.5-2.79-4.46-5-8.15-5-3.69 0-6.65 2.21-8.15 5 1.5 2.79 4.46 5 8.15 5Zm0-8.25A3.25 3.25 0 1 1 8.75 12 3.25 3.25 0 0 1 12 8.75Zm0 5A1.75 1.75 0 1 0 10.25 12 1.75 1.75 0 0 0 12 13.75Z"
                    />
                  </svg>
                </button>
              </div>
              <p class="field-help">输入你的 API Key，通常以 `sk-` 开头。</p>
            </div>

            <div class="field-block">
              <label class="field-label">API Base URL</label>
              <input
                v-model="localSettings.baseUrl"
                type="text"
                class="text-input"
                placeholder="https://api.example.com/v1"
              />
              <p class="field-help">填写兼容 OpenAI 的 API 基础地址。</p>
            </div>

            <div class="field-block">
              <label class="field-label">模型名称</label>
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
                class="text-input"
                :placeholder="modelHelpText || '读取可用模型后可在这里选择'"
              />
              <p class="field-help">
                {{ availableModels.length ? "从已识别的远程模型中直接选择。" : (modelHelpText || "当前尚未读取到远程模型列表。") }}
              </p>
            </div>
          </div>
        </section>

        <section class="content-panel">
          <div class="content-panel__head">
            <h2>快捷操作</h2>
            <div class="panel-inline-actions">
              <button type="button" class="ghost-button" @click="emit('exportConfig')">导出配置</button>
              <button type="button" class="ghost-button" @click="emit('importConfig')">导入配置</button>
            </div>
          </div>

          <div class="action-grid">
            <article class="action-card action-card--blue">
              <div class="action-card__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M9 3.75A2.25 2.25 0 0 0 6.75 6v2.14a2.24 2.24 0 0 1-.22.97l-2.4 4.79A2.25 2.25 0 0 0 6.14 17h11.72a2.25 2.25 0 0 0 2.01-3.1l-2.4-4.79a2.24 2.24 0 0 1-.22-.97V6A2.25 2.25 0 0 0 15 3.75H9Zm-.75 4.39V6A.75.75 0 0 1 9 5.25h6a.75.75 0 0 1 .75.75v2.14c0 .58.14 1.15.4 1.67l2.4 4.79a.75.75 0 0 1-.67 1.08H6.14a.75.75 0 0 1-.67-1.08l2.4-4.79c.26-.52.38-1.09.38-1.67Z"
                  />
                </svg>
              </div>
              <div class="action-card__body">
                <h3>测试连接</h3>
                <p>验证 API Key 和 Base URL 是否有效，并检查当前模型是否可用。</p>
                <button
                  type="button"
                  class="action-button action-button--blue"
                  :disabled="loadingTest"
                  @click="emitWithSnapshot('test')"
                >
                  {{ loadingTest ? "测试中..." : "开始测试" }}
                </button>
              </div>
            </article>

            <article class="action-card action-card--green">
              <div class="action-card__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5.25 3.75A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.56a2.25 2.25 0 0 0-.66-1.59l-2.31-2.31A2.25 2.25 0 0 0 16.44 4H5.25Zm0 1.5h10.69c.2 0 .39.08.53.22l2.31 2.31a.75.75 0 0 1 .22.53V18a.75.75 0 0 1-.75.75h-1.5v-5.5A1.25 1.25 0 0 0 15.5 12h-7A1.25 1.25 0 0 0 7.25 13.25v5.5h-2A.75.75 0 0 1 4.5 18V6a.75.75 0 0 1 .75-.75Zm9 13.5h-5.5V13.5h5.5v5.25Zm-6-10.5A.75.75 0 0 1 9 7.5h5.25a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75Z"
                  />
                </svg>
              </div>
              <div class="action-card__body">
                <h3>保存配置</h3>
                <p>保存当前配置到运行时配置文件，下次启动应用时会自动加载。</p>
                <button
                  type="button"
                  class="action-button action-button--green"
                  :disabled="loadingSave"
                  @click="emitWithSnapshot('save')"
                >
                  {{ loadingSave ? "保存中..." : "保存配置" }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <section v-if="recentModels.length || connectionHistory.length" class="content-panel content-panel--meta">
          <div class="meta-grid">
            <div v-if="recentModels.length" class="meta-card">
              <div class="meta-card__head">
                <h3>最近成功模型</h3>
              </div>
              <div class="meta-list">
                <button
                  v-for="(item, idx) in recentModels.slice(0, 4)"
                  :key="idx"
                  type="button"
                  class="meta-list__item"
                  @click="emit('selectRecentModel', item)"
                >
                  <span class="meta-list__title">{{ item.provider }} / {{ item.modelId }}</span>
                  <span class="meta-list__sub">{{ item.baseUrl }}</span>
                </button>
              </div>
            </div>

            <div v-if="connectionHistory.length" class="meta-card">
              <div class="meta-card__head">
                <h3>连接历史</h3>
                <button type="button" class="link-button" @click="emit('clearHistory')">清空</button>
              </div>
              <div class="meta-list">
                <div
                  v-for="entry in connectionHistory.slice(0, 5)"
                  :key="entry.id"
                  class="meta-history"
                  :class="{ 'meta-history--fail': !entry.success }"
                >
                  <span class="meta-history__status">{{ entry.success ? "成功" : "失败" }}</span>
                  <span class="meta-history__model">{{ entry.modelId }}</span>
                  <span v-if="entry.latencyMs" class="meta-history__latency">{{ entry.latencyMs }}ms</span>
                  <span class="meta-history__time">{{ formatHistoryTime(entry.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import deepseekIcon from "@/assets/providers/deepseek.png";
import openaiIcon from "@/assets/providers/openai.png";
import qwenIcon from "@/assets/providers/qwen.png";
import ollamaIcon from "@/assets/providers/ollama.png";

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
  "save",
  "detect",
  "test",
  "applyTemplate",
  "selectRecentModel",
  "selectAvailableModel",
  "exportConfig",
  "importConfig",
  "clearHistory"
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

const showApiKey = ref(false);
const providerIconMap = {
  deepseek: deepseekIcon,
  openai: openaiIcon,
  qwen: qwenIcon,
  ollama: ollamaIcon
};

watch(
  () => props.settings,
  (settings) => {
    Object.assign(localSettings, settings || {});
  },
  { immediate: true, deep: true }
);

const activeTemplateId = computed(() => {
  const byBaseUrl = props.templates.find((tpl) => tpl.baseUrl === localSettings.baseUrl);
  if (byBaseUrl) return byBaseUrl.id;

  const byProvider = props.templates.find((tpl) => tpl.name === localSettings.provider || tpl.id === localSettings.provider);
  return byProvider?.id || "";
});

const activeProviderLabel = computed(() => {
  if (localSettings.provider) return localSettings.provider;
  return props.templates.find((tpl) => tpl.id === activeTemplateId.value)?.name || "未识别";
});

function emitWithSnapshot(eventName) {
  emit(eventName, { ...localSettings });
}

function handleApplyTemplate(tpl) {
  emit("applyTemplate", tpl);
}

function resolveTemplateBrand(tpl) {
  const value = `${tpl?.id || ""} ${tpl?.name || ""}`.toLowerCase();
  if (value.includes("deepseek")) return "deepseek";
  if (value.includes("openai")) return "openai";
  if (value.includes("千问") || value.includes("qwen") || value.includes("tongyi")) return "qwen";
  if (value.includes("ollama")) return "ollama";
  return "custom";
}

function formatHistoryTime(value) {
  if (!value) return "";

  try {
    const date = new Date(value);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return "";
  }
}
</script>

<style scoped>
.settings-shell {
  width: 100%;
}

.settings-header {
  margin-bottom: 28px;
}

.settings-title {
  margin: 0 0 14px;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--text-primary);
}

.settings-subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-secondary);
}

.surface-card {
  background:
    linear-gradient(180deg, rgba(26, 36, 58, 0.86), rgba(15, 22, 38, 0.9)),
    rgba(12, 18, 32, 0.78);
  border: 1px solid rgba(77, 112, 176, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 16px 36px rgba(6, 10, 20, 0.2);
  backdrop-filter: blur(14px);
}

.status-strip,
.template-strip,
.settings-workbench {
  border-radius: 22px;
}

.status-strip {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.8fr);
  gap: 24px;
  align-items: center;
  padding: 28px 30px;
  margin-bottom: 24px;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.status-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, rgba(46, 95, 201, 0.24), rgba(46, 95, 201, 0.1));
  border: 1px solid rgba(86, 133, 230, 0.4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.status-icon svg {
  width: 40px;
  height: 40px;
  fill: #4f8cff;
  filter: drop-shadow(0 0 12px rgba(79, 140, 255, 0.35));
}

.status-summary__label {
  margin-bottom: 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

.status-summary__line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.status-badge {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  flex: 0 0 auto;
  background: #57df63;
  box-shadow: 0 0 12px rgba(87, 223, 99, 0.45);
}

.status-badge--dim {
  background: rgba(160, 171, 193, 0.78);
  box-shadow: none;
}

.status-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.status-meta__item {
  min-width: 0;
  padding: 0 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-meta__item + .status-meta__item {
  border-left: 1px solid rgba(88, 113, 166, 0.36);
}

.status-meta__label {
  font-size: 13px;
  color: var(--text-tertiary);
}

.status-meta__value {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.7;
  color: var(--text-primary);
}

.status-meta__value--path {
  word-break: break-all;
}

.template-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  padding: 20px 22px;
  margin-bottom: 24px;
}

.template-strip__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.template-strip__row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.template-tile {
  min-width: 152px;
  padding: 14px 18px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  border: 1px solid rgba(79, 103, 146, 0.42);
  background: rgba(19, 28, 45, 0.56);
  color: var(--text-secondary);
  cursor: pointer;
  transition: 0.2s ease;
}

.template-tile:hover {
  border-color: rgba(96, 141, 230, 0.46);
  background: rgba(28, 42, 68, 0.82);
  color: var(--text-primary);
}

.template-tile--active {
  border-color: rgba(89, 142, 255, 0.86);
  background: linear-gradient(180deg, rgba(40, 61, 98, 0.92), rgba(29, 42, 68, 0.88));
  color: #eef4ff;
  box-shadow:
    inset 0 0 0 1px rgba(112, 160, 255, 0.24),
    0 0 0 2px rgba(68, 112, 196, 0.18);
}

.template-tile__icon {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  background: rgba(74, 123, 225, 0.16);
}

.template-tile__icon svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.template-tile__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 999px;
}

.template-tile__icon--deepseek {
  color: #6ea8ff;
  background: linear-gradient(180deg, rgba(42, 89, 201, 0.2), rgba(20, 52, 118, 0.26));
}

.template-tile__icon--openai {
  color: #e7edf8;
  background: linear-gradient(180deg, rgba(196, 205, 224, 0.12), rgba(116, 129, 155, 0.18));
}

.template-tile__icon--qwen {
  color: #7db7ff;
  background: linear-gradient(180deg, rgba(69, 135, 255, 0.18), rgba(26, 61, 124, 0.24));
}

.template-tile__icon--ollama {
  color: #f0f5ff;
  background: linear-gradient(180deg, rgba(173, 186, 214, 0.14), rgba(78, 89, 111, 0.22));
}

.template-tile__icon--custom {
  color: #a4b6d9;
  background: linear-gradient(180deg, rgba(132, 151, 189, 0.16), rgba(65, 78, 103, 0.22));
}

.template-tile__name {
  font-size: 15px;
  font-weight: 600;
}

.template-strip__hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.template-strip__hint svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  opacity: 0.85;
}

.settings-workbench {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  overflow: hidden;
}

.settings-aside {
  padding: 18px;
  border-right: 1px solid rgba(88, 113, 166, 0.28);
  background: linear-gradient(180deg, rgba(19, 28, 46, 0.46), rgba(14, 21, 37, 0.72));
}

.prompt-panel {
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(74, 99, 146, 0.34);
  border-radius: 18px;
  background: rgba(16, 24, 41, 0.72);
}

.prompt-panel__head h2 {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.prompt-panel__head p {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--text-secondary);
}

.prompt-panel__textarea {
  flex: 1;
  width: 100%;
  min-height: 520px;
  border: 1px solid rgba(76, 104, 157, 0.38);
  border-radius: 14px;
  background: rgba(10, 16, 28, 0.72);
  padding: 16px;
  box-sizing: border-box;
  resize: vertical;
  outline: none;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.8;
}

.settings-content {
  min-width: 0;
  padding: 18px;
  display: grid;
  gap: 18px;
}

.content-panel {
  border: 1px solid rgba(78, 106, 156, 0.3);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(21, 30, 49, 0.58), rgba(15, 22, 38, 0.72));
  padding: 24px 30px;
}

.content-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.content-panel__head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.field-block {
  min-width: 0;
}

.field-label {
  display: block;
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.field-help {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.input-wrap {
  position: relative;
}

.text-input {
  width: 100%;
  min-height: 50px;
  padding: 13px 16px;
  border-radius: 14px;
  border: 1px solid rgba(89, 118, 175, 0.5);
  background: rgba(22, 31, 49, 0.84);
  outline: none;
  box-sizing: border-box;
  color: var(--text-primary);
  font-size: 14px;
  transition: 0.16s ease;
}

.text-input:focus,
.prompt-panel__textarea:focus {
  border-color: rgba(103, 150, 255, 0.76);
  box-shadow: 0 0 0 3px rgba(75, 121, 226, 0.14);
}

.text-input::placeholder,
.prompt-panel__textarea::placeholder {
  color: rgba(191, 201, 221, 0.46);
}

.text-input--with-action {
  padding-right: 48px;
}

.text-input--select {
  appearance: auto;
}

.input-action {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(195, 207, 230, 0.76);
  cursor: pointer;
}

.input-action svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.ghost-button {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid rgba(85, 114, 170, 0.46);
  background: rgba(22, 31, 49, 0.68);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.18s ease;
}

.ghost-button:hover {
  background: rgba(32, 45, 70, 0.84);
  color: var(--text-primary);
}

.ghost-button:disabled {
  opacity: 0.64;
  cursor: not-allowed;
}

.panel-inline-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.action-card {
  min-width: 0;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
  padding: 26px 20px;
  border-radius: 16px;
  border: 1px solid rgba(80, 107, 157, 0.34);
  background: linear-gradient(180deg, rgba(30, 40, 62, 0.76), rgba(20, 28, 47, 0.86));
}

.action-card__icon {
  width: 68px;
  height: 68px;
  border-radius: 16px;
  display: grid;
  place-items: center;
}

.action-card--blue .action-card__icon {
  background: linear-gradient(180deg, rgba(56, 99, 207, 0.26), rgba(44, 78, 156, 0.16));
  border: 1px solid rgba(83, 129, 230, 0.32);
}

.action-card--green .action-card__icon {
  background: linear-gradient(180deg, rgba(76, 176, 104, 0.26), rgba(47, 128, 70, 0.16));
  border: 1px solid rgba(100, 205, 128, 0.28);
}

.action-card__icon svg {
  width: 34px;
  height: 34px;
}

.action-card--blue .action-card__icon svg {
  fill: #67a4ff;
}

.action-card--green .action-card__icon svg {
  fill: #66df79;
}

.action-card__body h3 {
  margin: 2px 0 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.action-card__body p {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.action-button {
  min-height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  color: #f7fbff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.18s ease;
}

.action-button:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.action-button--blue {
  background: linear-gradient(180deg, #4f8cff, #3770e0);
  box-shadow: 0 10px 24px rgba(54, 107, 219, 0.24);
}

.action-button--green {
  background: linear-gradient(180deg, #52cb67, #38a952);
  box-shadow: 0 10px 24px rgba(57, 169, 83, 0.22);
}

.content-panel--meta {
  padding-top: 20px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.meta-card {
  min-width: 0;
  border: 1px solid rgba(74, 101, 146, 0.3);
  border-radius: 16px;
  background: rgba(14, 22, 37, 0.58);
  padding: 18px;
}

.meta-card__head {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.meta-card__head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.meta-list__item {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(72, 98, 142, 0.28);
  background: rgba(20, 29, 46, 0.76);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.meta-list__item:hover {
  background: rgba(29, 41, 64, 0.88);
}

.meta-list__title {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.meta-list__sub {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  word-break: break-all;
}

.meta-history {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(20, 29, 46, 0.76);
}

.meta-history--fail {
  opacity: 0.78;
}

.meta-history__status {
  color: #5fdf79;
  font-size: 12px;
  font-weight: 700;
}

.meta-history--fail .meta-history__status {
  color: #ff7b7b;
}

.meta-history__model {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-primary);
}

.meta-history__latency,
.meta-history__time {
  font-size: 12px;
  color: var(--text-secondary);
}

.link-button {
  padding: 0;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.link-button:hover {
  color: #8db4ff;
}

@media (max-width: 1440px) {
  .status-strip {
    grid-template-columns: 1fr;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1200px) {
  .template-strip {
    grid-template-columns: 1fr;
  }

  .template-strip__hint {
    justify-self: start;
  }

  .settings-workbench {
    grid-template-columns: 1fr;
  }

  .settings-aside {
    border-right: none;
    border-bottom: 1px solid rgba(88, 113, 166, 0.28);
  }

  .prompt-panel__textarea {
    min-height: 280px;
  }
}

@media (max-width: 900px) {
  .status-strip,
  .template-strip,
  .content-panel,
  .settings-aside,
  .settings-content {
    padding-left: 18px;
    padding-right: 18px;
  }

  .status-meta {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .status-meta__item {
    padding: 0;
  }

  .status-meta__item + .status-meta__item {
    border-left: none;
    border-top: 1px solid rgba(88, 113, 166, 0.28);
    padding-top: 18px;
  }

  .action-grid,
  .meta-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .settings-title {
    font-size: 28px;
  }

  .status-summary {
    align-items: flex-start;
  }

  .template-tile {
    min-width: calc(50% - 7px);
  }

  .content-panel__head,
  .panel-inline-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .action-card {
    grid-template-columns: 1fr;
  }
}
</style>
