<template>
  <div class="cloze-editor">
    <el-form-item label="提示说明">
      <el-input v-model="draft.frontText" type="textarea" :rows="3" maxlength="20000" @input="emitChange" />
    </el-form-item>

    <el-form-item label="完形填空模板">
      <el-input
        v-model="draft.templateText"
        type="textarea"
        :rows="8"
        maxlength="20000"
        placeholder="使用 {{答案}} 标记需要隐藏的内容"
        @input="emitChange"
      />
    </el-form-item>

    <div class="cloze-editor__meta">
      <span>已识别空格：{{ answers.length }}</span>
      <span v-if="answers.length">答案：{{ answers.join(" / ") }}</span>
    </div>

    <div class="cloze-editor__preview">
      <h4>预览</h4>
      <p>{{ maskedPreview }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      frontText: "",
      templateText: ""
    })
  }
});

const emit = defineEmits(["update:modelValue"]);

const draft = reactive({
  frontText: props.modelValue.frontText || "",
  templateText: props.modelValue.templateText || ""
});

watch(
  () => props.modelValue,
  (value) => {
    draft.frontText = value?.frontText || "";
    draft.templateText = value?.templateText || "";
  },
  { deep: true }
);

const answers = computed(() =>
  [...draft.templateText.matchAll(/\{\{(.*?)\}\}/g)]
    .map((match) => String(match[1] || "").trim())
    .filter(Boolean)
);

const maskedPreview = computed(() => draft.templateText.replace(/\{\{(.*?)\}\}/g, "____"));

function emitChange() {
  emit("update:modelValue", {
    frontText: draft.frontText,
    templateText: draft.templateText
  });
}
</script>

<style scoped>
.cloze-editor {
  display: flex;
  flex-direction: column;
}

.cloze-editor__meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.cloze-editor__preview {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  background: var(--bg-surface-alt);
}

.cloze-editor__preview h4 {
  margin: 0 0 8px;
}

.cloze-editor__preview p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.65;
}
</style>
