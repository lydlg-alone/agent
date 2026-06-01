<template>
  <footer class="composer-panel">
    <div class="composer-inner">
      <div class="composer-box">
        <button type="button" class="composer-attach" :disabled="loadingUpload" title="上传会话附件" @click="$emit('attach')">
          <svg viewBox="0 0 24 24" class="composer-icon">
            <path
              d="M12 3.75a.75.75 0 0 1 .75.75v8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 1.06-1.06l2.72 2.72V4.5a.75.75 0 0 1 .75-.75Zm-6 12a.75.75 0 0 1 .75.75v.75c0 .41.34.75.75.75h9a.75.75 0 0 0 .75-.75v-.75a.75.75 0 0 1 1.5 0v.75A2.25 2.25 0 0 1 17.25 19.5h-9A2.25 2.25 0 0 1 6 17.25v-.75a.75.75 0 0 1 .75-.75Z"
            />
          </svg>
        </button>

        <textarea
          ref="composerRef"
          :value="modelValue"
          class="composer-input"
          rows="1"
          placeholder="输入你的学习任务，例如：基于知识库生成 20 道测试题，并附上答案解析。"
          @input="handleInput"
          @keydown.enter.exact.prevent="$emit('send')"
        />

        <button type="button" class="send-button" :disabled="loadingSend" @click="$emit('send')">
          {{ loadingSend ? "发送中" : "发送" }}
        </button>
      </div>

      <div class="hint-row">
        <span>Enter 发送，Shift + Enter 换行</span>
        <span>{{ statusText }}</span>
      </div>

      <div v-if="pendingAttachments.length" class="pending-files">
        <span class="pending-files__label">待发送附件</span>
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
  }
});

const emit = defineEmits(["update:modelValue", "attach", "send"]);

const composerRef = ref(null);

function resizeComposer() {
  const element = composerRef.value;
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
}

function handleInput(event) {
  emit("update:modelValue", event.target.value);
  resizeComposer();
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
  padding: 20px 32px 24px;
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
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 24px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-card);
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
  color: #cad8ee;
  cursor: pointer;
  transition: color 0.2s ease;
}

.composer-attach:hover {
  color: #f2f7ff;
}

.composer-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
  filter: drop-shadow(0 0 8px rgba(146, 183, 255, 0.16));
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
  color: var(--text-primary);
  outline: none;
  resize: none;
}

.send-button {
  min-width: 96px;
  height: 48px;
  flex-shrink: 0;
  border: none;
  border-radius: 18px;
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
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
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

  .hint-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .composer-box {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
