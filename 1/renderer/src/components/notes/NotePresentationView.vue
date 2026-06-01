<template>
  <section class="presentation-view">
    <header class="presentation-view__header">
      <div>
        <span class="presentation-view__eyebrow">Presentation</span>
        <h3>{{ title || "未命名笔记" }}</h3>
      </div>
      <p>将笔记按章节拆分为可快速浏览的演示卡片。</p>
    </header>

    <div v-if="!slides.length" class="presentation-view__empty">
      暂无可展示的内容。
    </div>

    <div v-else class="presentation-view__deck">
      <article v-for="slide in slides" :key="slide.id" class="presentation-view__slide">
        <span class="presentation-view__index">{{ slide.id.split("-")[0] * 1 + 1 }}</span>
        <h4>{{ slide.title }}</h4>
        <ul>
          <li v-for="bullet in slide.bullets" :key="bullet">{{ bullet }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { buildPresentationSlides } from "@/utils/noteTransforms.js";

const props = defineProps({
  title: {
    type: String,
    default: ""
  },
  content: {
    type: String,
    default: ""
  }
});

const slides = computed(() => buildPresentationSlides(props.content, props.title || "未命名笔记"));
</script>

<style scoped>
.presentation-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.presentation-view__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.presentation-view__header h3,
.presentation-view__slide h4 {
  margin: 0;
}

.presentation-view__eyebrow {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.presentation-view__header p,
.presentation-view__slide li {
  color: var(--text-secondary);
}

.presentation-view__empty,
.presentation-view__slide {
  border-radius: 24px;
  background: var(--bg-overlay-strong);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
}

.presentation-view__empty {
  padding: 24px;
}

.presentation-view__deck {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.presentation-view__slide {
  min-height: 280px;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(236, 248, 255, 0.92));
}

.presentation-view__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-bottom: 18px;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
  font-size: 14px;
  font-weight: 700;
}

.presentation-view__slide ul {
  margin: 16px 0 0;
  padding-left: 20px;
}

.presentation-view__slide li + li {
  margin-top: 10px;
}

@media (max-width: 720px) {
  .presentation-view__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
