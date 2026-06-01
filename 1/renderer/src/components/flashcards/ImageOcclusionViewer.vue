<template>
  <div class="image-occlusion-viewer">
    <p v-if="frontText" class="image-occlusion-viewer__prompt">{{ frontText }}</p>
    <div v-if="imageDataUrl" class="image-occlusion-viewer__canvas">
      <img :src="imageDataUrl" alt="occlusion card" class="image-occlusion-viewer__image" />
      <div
        v-for="mask in masks"
        :key="mask.id"
        class="image-occlusion-viewer__mask"
        :class="{ 'image-occlusion-viewer__mask--revealed': revealed }"
        :style="maskStyle(mask)"
      >
        <span v-if="revealed">{{ mask.label || "遮挡区" }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  frontText: {
    type: String,
    default: ""
  },
  imageDataUrl: {
    type: String,
    default: ""
  },
  masks: {
    type: Array,
    default: () => []
  },
  revealed: {
    type: Boolean,
    default: false
  }
});

function maskStyle(mask) {
  return {
    left: `${mask.x}%`,
    top: `${mask.y}%`,
    width: `${mask.width}%`,
    height: `${mask.height}%`
  };
}
</script>

<style scoped>
.image-occlusion-viewer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-occlusion-viewer__prompt {
  margin: 0;
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.7;
}

.image-occlusion-viewer__canvas {
  position: relative;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface-alt);
}

.image-occlusion-viewer__image {
  display: block;
  width: 100%;
  max-height: 460px;
  object-fit: contain;
}

.image-occlusion-viewer__mask {
  position: absolute;
  border: 2px solid rgba(245, 158, 11, 0.95);
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-occlusion-viewer__mask--revealed {
  background: rgba(245, 158, 11, 0.28);
}

.image-occlusion-viewer__mask span {
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
}
</style>
