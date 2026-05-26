<template>
  <div class="attachment-card" :class="[`attachment-card--${variant}`, { 'attachment-card--removable': removable }]">
    <div class="attachment-card__badge" :class="badgeClass">{{ badgeText }}</div>

    <div class="attachment-card__body">
      <div class="attachment-card__name" :title="attachment.name">{{ attachment.name }}</div>
      <div class="attachment-card__meta">{{ metaText }}</div>
    </div>

    <button
      v-if="removable"
      type="button"
      class="attachment-card__remove"
      title="移除附件"
      aria-label="移除附件"
      @click="$emit('remove', attachment)"
    >
      x
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { formatSize } from "@/utils/workspaceFormatters.js";

const props = defineProps({
  attachment: {
    type: Object,
    required: true
  },
  removable: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: "composer"
  }
});

defineEmits(["remove"]);

const extensionText = computed(() => {
  const name = String(props.attachment?.name || "");
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
});

const badgeText = computed(() => {
  if (props.attachment?.isImage) {
    return "IMG";
  }

  return extensionText.value.slice(0, 4);
});

const badgeClass = computed(() => (props.attachment?.isImage ? "attachment-card__badge--image" : "attachment-card__badge--file"));

const metaText = computed(() => {
  const typeLabel = props.attachment?.isImage ? "图片" : extensionText.value;
  const sizeText = props.attachment?.sizeBytes ? formatSize(props.attachment.sizeBytes) : "";
  return [typeLabel, sizeText].filter(Boolean).join(" ");
});
</script>

<style scoped>
.attachment-card {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(160, 184, 214, 0.58);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 24px rgba(70, 108, 162, 0.08);
}

.attachment-card--composer {
  width: min(280px, 100%);
}

.attachment-card--message {
  width: min(240px, 100%);
  background: rgba(255, 255, 255, 0.78);
}

.attachment-card__badge {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.attachment-card__badge--file {
  background: linear-gradient(180deg, #6f8fff 0%, #5177f6 100%);
  color: #fff;
}

.attachment-card__badge--image {
  background: linear-gradient(180deg, #5bc8a6 0%, #2ca87f 100%);
  color: #fff;
}

.attachment-card__body {
  min-width: 0;
  flex: 1;
}

.attachment-card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.attachment-card__meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

.attachment-card__remove {
  position: absolute;
  top: -9px;
  right: -9px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: rgba(64, 77, 97, 0.84);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(33, 44, 63, 0.24);
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;
}

.attachment-card__remove:hover {
  transform: scale(1.05);
  background: rgba(32, 42, 58, 0.96);
}

@media (max-width: 900px) {
  .attachment-card--composer,
  .attachment-card--message {
    width: 100%;
  }
}
</style>
