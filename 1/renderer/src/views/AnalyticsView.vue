<template>
  <div class="analytics-dashboard">
    <!-- 统计卡片 -->
    <div class="stat-cards-row">
      <div class="stat-card" v-for="card in statCards" :key="card.label">
        <span class="stat-card__label">{{ card.label }}</span>
        <strong class="stat-card__value">{{ card.value }}</strong>
        <p class="stat-card__hint">{{ card.hint }}</p>
      </div>
    </div>

    <!-- 图表行 -->
    <div class="chart-row" v-if="hasData">
      <div class="chart-panel">
        <h3>📊 每日对话活跃度（近 7 天）</h3>
        <div ref="activityChartRef" class="chart-box"></div>
      </div>
      <div class="chart-panel" v-if="hasScoreData">
        <h3>📈 练习得分趋势（近 30 天）</h3>
        <div ref="scoreChartRef" class="chart-box"></div>
      </div>
    </div>

    <div class="chart-row" v-if="hasDocTypeData">
      <div class="chart-panel chart-panel--half">
        <h3>📁 文档类型分布</h3>
        <div ref="docTypeChartRef" class="chart-box chart-box--small"></div>
      </div>
      <div class="chart-panel chart-panel--half">
        <h3>📋 最近文档</h3>
        <ul class="recent-list">
          <li v-for="doc in recentDocuments" :key="doc.id">
            <span class="recent-list__name">{{ doc.name }}</span>
            <span class="recent-list__meta">{{ doc.sourceType }} · {{ formatSize(doc.sizeBytes) }}</span>
          </li>
          <li v-if="!recentDocuments.length" class="recent-list__empty">暂无文档</li>
        </ul>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasData" class="empty-state">
      <p>📭 还没有学习数据</p>
      <span>开始聊天、导入知识库或做练习题后，这里会展示你的学习数据分析。</span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import * as echarts from "echarts/core";
import { LineChart, PieChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { fetchAnalytics } from "@/services/api.js";
import { useThemeStore } from "@/stores/theme.js";

// 按需注册 ECharts 组件
echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const themeStore = useThemeStore();

const analytics = ref(null);
const loading = ref(false);

const activityChartRef = ref(null);
const scoreChartRef = ref(null);
const docTypeChartRef = ref(null);

let activityChart = null;
let scoreChart = null;
let docTypeChart = null;

const hasData = computed(() => !!analytics.value);
const hasScoreData = computed(() => (analytics.value?.scoreTrend || []).length > 0);
const hasDocTypeData = computed(() => (analytics.value?.docTypeDistribution || []).length > 0);
const recentDocuments = computed(() => analytics.value?.recentDocuments || []);

const statCards = computed(() => {
  const c = analytics.value?.counts || {};
  return [
    { label: "会话数", value: c.sessions ?? "-", hint: "累计对话会话" },
    { label: "消息数", value: c.messages ?? "-", hint: `${c.userMessages ?? 0} 问 / ${c.assistantMessages ?? 0} 答` },
    { label: "知识文档", value: c.documents ?? "-", hint: formatSize(c.totalDocSizeBytes ?? 0) },
    { label: "练习题", value: c.questions ?? "-", hint: `均分 ${analytics.value?.practiceSummary?.avgScore ?? "-"}` },
    { label: "生成资源", value: c.resources ?? "-", hint: "AI 生成的讲义/提纲" },
    { label: "书签", value: c.bookmarks ?? "0", hint: "收藏的有用回复" }
  ];
});

function buildActivityChart(data) {
  if (!activityChartRef.value) return null;
  if (activityChart) activityChart.dispose();

  const chart = echarts.init(activityChartRef.value);
  const days = (data || []).map((d) => d.day);
  const users = (data || []).map((d) => d.user_count || 0);
  const assistants = (data || []).map((d) => d.assistant_count || 0);

  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["用户消息", "AI 回复"], bottom: 0, textStyle: { color: themeStore.isDark ? "#94a3b8" : "#6b7280" } },
    grid: { left: 40, right: 16, top: 16, bottom: 40 },
    xAxis: { type: "category", data: days, axisLabel: { color: themeStore.isDark ? "#94a3b8" : "#6b7280" } },
    yAxis: { type: "value", minInterval: 1, axisLabel: { color: themeStore.isDark ? "#94a3b8" : "#6b7280" } },
    series: [
      { name: "用户消息", type: "line", data: users, smooth: true, lineStyle: { color: "#3b82f6" }, itemStyle: { color: "#3b82f6" } },
      { name: "AI 回复", type: "line", data: assistants, smooth: true, lineStyle: { color: "#22c55e" }, itemStyle: { color: "#22c55e" } }
    ]
  });

  return chart;
}

function buildScoreChart(data) {
  if (!scoreChartRef.value) return null;
  if (scoreChart) scoreChart.dispose();

  const chart = echarts.init(scoreChartRef.value);
  const days = (data || []).map((d) => d.day);
  const scores = (data || []).map((d) => d.avg_score || 0);

  chart.setOption({
    tooltip: { trigger: "axis", formatter: (p) => `${p[0].axisValue}<br/>均分：${p[0].value}` },
    grid: { left: 40, right: 16, top: 16, bottom: 40 },
    xAxis: { type: "category", data: days, axisLabel: { color: themeStore.isDark ? "#94a3b8" : "#6b7280" } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: themeStore.isDark ? "#94a3b8" : "#6b7280" } },
    series: [{
      name: "均分", type: "line", data: scores,
      areaStyle: { color: "rgba(59, 130, 246, 0.15)" },
      lineStyle: { color: "#3b82f6" },
      itemStyle: { color: "#3b82f6" }
    }]
  });

  return chart;
}

function buildDocTypeChart(distribution) {
  if (!docTypeChartRef.value) return null;
  if (docTypeChart) docTypeChart.dispose();

  const chart = echarts.init(docTypeChartRef.value);
  const pieData = (distribution || []).map((d) => ({ name: d.type || "unknown", value: d.count }));

  chart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: {c} 份 ({d}%)" },
    series: [{
      type: "pie",
      radius: ["40%", "70%"],
      center: ["50%", "55%"],
      data: pieData,
      label: { color: themeStore.isDark ? "#94a3b8" : "#6b7280" },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.2)" } }
    }]
  });

  return chart;
}

function resizeCharts() {
  activityChart?.resize();
  scoreChart?.resize();
  docTypeChart?.resize();
}

async function loadData() {
  loading.value = true;
  try {
    analytics.value = await fetchAnalytics();
    await nextTick();
    activityChart = buildActivityChart(analytics.value?.dailyActivity);
    scoreChart = buildScoreChart(analytics.value?.scoreTrend);
    docTypeChart = buildDocTypeChart(analytics.value?.docTypeDistribution);
  } catch {
    analytics.value = null;
  } finally {
    loading.value = false;
  }
}

function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

watch(() => themeStore.resolved, () => {
  // Rebuild charts on theme change to pick up new axis colors
  if (analytics.value) {
    activityChart = buildActivityChart(analytics.value?.dailyActivity);
    scoreChart = buildScoreChart(analytics.value?.scoreTrend);
    docTypeChart = buildDocTypeChart(analytics.value?.docTypeDistribution);
  }
});

onMounted(() => {
  loadData();
  window.addEventListener("resize", resizeCharts);
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeCharts);
  activityChart?.dispose();
  scoreChart?.dispose();
  docTypeChart?.dispose();
});
</script>

<style scoped>
.analytics-dashboard {
  max-width: 1100px;
  margin: 0 auto;
}

.stat-cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 20px;
}

.stat-card__label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stat-card__value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 4px 0;
}

.stat-card__hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 24px;
}

.chart-panel h3 {
  margin: 0 0 16px;
  font-size: 15px;
  color: var(--text-primary);
}

.chart-box {
  width: 100%;
  height: 300px;
}

.chart-box--small {
  height: 260px;
}

.chart-panel--half {
  /* same as chart-panel */
}

.recent-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recent-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
}

.recent-list li:last-child {
  border-bottom: none;
}

.recent-list__name {
  font-size: 14px;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 12px;
}

.recent-list__meta {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.recent-list__empty {
  color: var(--text-tertiary);
  text-align: center;
  padding: 32px 0;
  border: none !important;
}

.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
}

.empty-state p {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px;
}

.empty-state span {
  font-size: 14px;
}

@media (max-width: 768px) {
  .chart-row {
    grid-template-columns: 1fr;
  }
}
</style>
