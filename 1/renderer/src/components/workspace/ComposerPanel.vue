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
