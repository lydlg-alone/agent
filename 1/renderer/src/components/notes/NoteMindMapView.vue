<template>
  <section class="mind-map-view">
    <header class="mind-map-view__header">
      <span class="mind-map-view__badge">Mind Map</span>
      <h3>{{ map.title }}</h3>
    </header>

    <div v-if="!map.branches.length" class="mind-map-view__empty">
      暂无可用于生成思维导图的结构化内容。
    </div>

    <div v-else class="mind-map-view__branches">
      <article v-for="branch in map.branches" :key="branch.title" class="mind-map-view__branch">
        <h4>{{ branch.title }}</h4>
        <ul>
          <li v-for="item in branch.items" :key="item">{{ item }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { buildMindMap } from "@/utils/noteTransforms.js";

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

const map = computed(() => buildMindMap(props.content, props.title || "未命名笔记"));
</script>

<style scoped>
.mind-map-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.mind-map-view__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mind-map-view__header h3 {
  margin: 0;
  font-size: 20px;
}

.mind-map-view__badge {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-blue);
  background: var(--brand-blue-light);
}

.mind-map-view__empty,
.mind-map-view__branch {
  border-radius: 24px;
  padding: 20px;
  background: var(--bg-overlay-strong);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
}

.mind-map-view__branches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.mind-map-view__branch {
  position: relative;
  overflow: hidden;
}

.mind-map-view__branch::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 6px;
  background: linear-gradient(180deg, #38bdf8, #0ea5e9);
}

.mind-map-view__branch h4 {
  margin: 0 0 12px;
  padding-left: 8px;
  font-size: 16px;
}

.mind-map-view__branch ul {
  margin: 0;
  padding-left: 24px;
  color: var(--text-secondary);
}

.mind-map-view__branch li + li {
  margin-top: 8px;
}
</style>
