<template>
  <footer class="composer-panel">
    <div class="composer-inner">
      <div class="composer-box">
        <textarea
          ref="composerRef"
          :value="modelValue"
          class="composer-input"
          rows="3"
          placeholder="输入你的学习任务，例如：基于知识库生成 20 道测试题，并附上答案解析。"
          @input="handleInput"
          @keydown.enter.exact.prevent="$emit('send')"
        />

        <div class="composer-toolbar">
          <div class="composer-toolbar__left">
            <button type="button" class="composer-attach" :disabled="loadingUpload" title="上传附件" @click="$emit('attach')">
              <span class="composer-attach__plus">+</span>
            </button>

            <div class="tool-row">
              <button
                v-for="tool in toolButtons"
                :key="tool.key"
                type="button"
                class="tool-toggle"
                :class="{ 'tool-toggle--active': toolOptions[tool.key] }"
                :title="tool.title"
                :aria-pressed="toolOptions[tool.key] ? 'true' : 'false'"
                @click="toggleTool(tool.key)"
              >
                <span class="tool-toggle__icon">{{ tool.icon }}</span>
                <span>{{ tool.label }}</span>
              </button>
            </div>
          </div>

          <div class="composer-toolbar__right">
            <button type="button" class="send-button" :disabled="loadingSend" @click="$emit('send')">
              {{ loadingSend ? "发送中" : "发送" }}
            </button>
          </div>
        </div>
      </div>

      <div class="hint-row">
        <span>Enter 发送，Shift + Enter 换行</span>
        <span>{{ statusText }}</span>
      </div>

      <div v-if="pendingAttachments.length" class="pending-files">
        <span class="pending-files__label">待发送附件：</span>
        <span v-for="attachment in pendingAttachments" :key="attachment.id" class="attachment-chip">
          {{ attachment.name }}
        </span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: ""
  },
  loadingSend: {
    type: Boolean,
    default: false
  },
  loadingUpload: {
    type: Boolean,
    default: false
  },
  statusText: {
    type: String,
    default: ""
  },
  pendingAttachments: {
    type: Array,
    default: () => []
  },
  toolOptions: {
    type: Object,
    default: () => ({
      useTools: false,
      useWebSearch: false,
      useStructuredOutput: false,
      useHybridRetrieval: true,
      useImageVision: true
    })
  }
});

const emit = defineEmits(["update:modelValue", "update:toolOptions", "attach", "send"]);

const composerRef = ref(null);
const toolButtons = [
  {
    key: "useTools",
    label: "工具",
    icon: "T",
    title: "启用工具调用能力"
  },
  {
    key: "useWebSearch",
    label: "联网",
    icon: "W",
    title: "启用网页搜索和实时信息获取"
  },
  {
    key: "useStructuredOutput",
    label: "结构化",
    icon: "{}",
    title: "要求模型返回 JSON 结构化结果"
  },
  {
    key: "useHybridRetrieval",
    label: "混合检索",
    icon: "R",
    title: "启用关键词、向量和 rerank 混合检索"
  },
  {
    key: "useImageVision",
    label: "识图",
    icon: "I",
    title: "将图片附件转为可供模型识别的视觉输入"
  }
];

function resizeComposer() {
  const element = composerRef.value;
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 190)}px`;
}

function handleInput(event) {
  emit("update:modelValue", event.target.value);
  resizeComposer();
}

function toggleTool(key) {
  const next = {
    ...props.toolOptions,
    [key]: !props.toolOptions[key]
  };

  if (key === "useWebSearch" && next.useWebSearch) {
    next.useTools = true;
  }

  emit("update:toolOptions", next);
}

watch(
  () => props.modelValue,
  () => {
    nextTick(() => {
      resizeComposer();
    });
  }
);

onMounted(() => {
  resizeComposer();
});

defineExpose({
  resizeComposer
});
</script>

<style scoped>
.composer-panel {
  position: relative;
  z-index: 8;
  flex-shrink: 0;
  padding: 16px 32px max(42px, env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, rgba(239, 248, 255, 0.04) 0%, var(--bg-overlay-strong) 22%, var(--bg-overlay-strong) 100%);
  border-top: 1px solid var(--brand-blue-border);
  box-shadow: 0 -10px 30px rgba(37, 87, 142, 0.08);
  backdrop-filter: blur(12px);
}

.composer-inner {
  max-width: 1320px;
  margin: 0 auto;
}

.composer-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 18px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 24px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-card);
}

.composer-attach {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #cad8ee;
  cursor: pointer;
  transition: color 0.2s ease;
}

.composer-attach:hover {
  color: #f2f7ff;
}

.composer-attach__plus {
  font-size: 28px;
  line-height: 1;
  font-weight: 300;
  filter: drop-shadow(0 0 8px rgba(146, 183, 255, 0.16));
}

.composer-input {
  width: 100%;
  min-height: 76px;
  max-height: 190px;
  border: none;
  background: transparent;
  padding: 2px 6px 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  outline: none;
  resize: none;
}

.composer-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid rgba(132, 186, 221, 0.55);
  padding-top: 10px;
}

.composer-toolbar__left {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.composer-toolbar__right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.send-button {
  min-width: 112px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: 14px;
  background: var(--brand-blue);
  color: var(--text-inverse);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.send-button:hover {
  background: var(--brand-blue-hover);
}

.hint-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 10px;
  padding: 0 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.tool-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.tool-toggle {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: 0.2s ease;
}

.tool-toggle--active {
  border-color: var(--brand-blue);
  background: var(--brand-blue-light);
  color: var(--brand-blue);
}

.tool-toggle__icon {
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 11px;
  font-weight: 700;
}

.pending-files {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pending-files__label {
  font-size: 12px;
  color: var(--text-secondary);
  align-self: center;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--brand-blue-light);
  color: var(--brand-blue);
  font-size: 12px;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .composer-panel {
    padding-left: 20px;
    padding-right: 20px;
  }

  .composer-toolbar,
  .composer-toolbar__left,
  .composer-toolbar__right {
    flex-direction: column;
    align-items: stretch;
  }

  .hint-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .send-button {
    width: 100%;
  }
}

@media (max-height: 920px) {
  .composer-panel {
    padding-top: 10px;
    padding-bottom: max(28px, env(safe-area-inset-bottom, 0px));
  }

  .composer-box {
    gap: 8px;
    padding: 10px 14px 10px;
    border-radius: 20px;
  }

  .composer-toolbar {
    gap: 10px;
    padding-top: 8px;
  }

  .send-button {
    min-width: 96px;
  }

  .composer-input {
    min-height: 64px;
    max-height: 132px;
    font-size: 14px;
  }

  .hint-row {
    margin-top: 8px;
    padding: 0 2px;
    font-size: 11px;
  }

  .tool-row {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }

  .tool-toggle {
    height: 28px;
    flex: 0 0 auto;
    padding: 0 8px;
    font-size: 11px;
  }

  .tool-toggle__icon {
    min-width: 16px;
    height: 16px;
    font-size: 10px;
  }

  .pending-files {
    margin-top: 8px;
    gap: 6px;
  }

  .attachment-chip {
    padding: 3px 8px;
    font-size: 11px;
  }
}
</style>
