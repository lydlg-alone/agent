<template>
  <div class="page-stack">
    <SectionBlock title="数据可视化" description="展示学习进度、正确率趋势和能力变化。">
      <div class="card-grid">
        <div class="chart-card">
          <span>学习进度</span>
          <strong>{{ progress }}</strong>
          <p>最近 5 个阶段持续增长</p>
        </div>
        <div class="chart-card">
          <span>正确率趋势</span>
          <strong>{{ accuracy }}</strong>
          <p>专项练习后准确率提升明显</p>
        </div>
      </div>
    </SectionBlock>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import SectionBlock from "@/components/SectionBlock.vue";
import { useAppStore } from "@/stores/app.js";

const store = useAppStore();
const progress = computed(() => `${store.summary?.charts.progressTrend?.at(-1) ?? 0}%`);
const accuracy = computed(() => `${store.summary?.charts.accuracyTrend?.at(-1) ?? 0}%`);

onMounted(() => {
  if (!store.summary) {
    store.loadSummary();
  }
});
</script>
