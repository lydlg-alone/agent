<template>
  <div class="cloze-renderer">
    <p v-if="frontText" class="cloze-renderer__prompt">{{ frontText }}</p>
    <p class="cloze-renderer__body">{{ renderedText }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  frontText: {
    type: String,
    default: ""
  },
  templateText: {
    type: String,
    default: ""
  },
  revealed: {
    type: Boolean,
    default: false
  }
});

const renderedText = computed(() => {
  if (props.revealed) {
    return props.templateText.replace(/\{\{(.*?)\}\}/g, (_, value) => `[${String(value || "").trim()}]`);
  }
  return props.templateText.replace(/\{\{(.*?)\}\}/g, "____");
});
</script>

<style scoped>
.cloze-renderer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cloze-renderer__prompt,
.cloze-renderer__body {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.75;
}

.cloze-renderer__prompt {
  color: var(--text-secondary);
}
</style>
