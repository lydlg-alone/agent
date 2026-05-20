<template>
  <section class="analytics-dashboard">
    <header class="analytics-hero">
      <div>
        <p class="analytics-hero__eyebrow">学习仪表盘</p>
        <h1 class="analytics-hero__title">把聊天、知识库和练习数据放到同一张总览里。</h1>
        <p class="analytics-hero__subtitle">
          这里展示最近活跃度、练习得分、知识文档构成和近期学习轨迹，方便快速判断当前学习节奏。
        </p>
      </div>

      <button class="analytics-refresh" type="button" :disabled="loading" @click="loadData">
        {{ loading ? "刷新中..." : "刷新数据" }}
      </button>
    </header>

    <div v-if="loading && !analytics" class="analytics-loading">
      <div class="analytics-loading__card" v-for="index in 4" :key="index"></div>
    </div>

    <template v-else-if="analytics">
      <section class="analytics-overview">
        <article
          v-for="card in primaryCards"
          :key="card.label"
          class="overview-card"
          :class="`overview-card--${card.tone}`"
        >
          <span class="overview-card__label">{{ card.label }}</span>
          <strong class="overview-card__value">{{ card.value }}</strong>
          <p class="overview-card__hint">{{ card.hint }}</p>
        </article>
      </section>

      <section class="analytics-summary-strip">
        <div class="summary-chip" v-for="item in secondaryCards" :key="item.label">
          <span class="summary-chip__label">{{ item.label }}</span>
          <strong class="summary-chip__value">{{ item.value }}</strong>
        </div>
      </section>

      <section class="analytics-grid analytics-grid--top">
        <article class="panel panel--activity">
          <div class="panel__header">
            <div>
              <p class="panel__eyebrow">近 7 天</p>
              <h2 class="panel__title">每日对话活跃度</h2>
            </div>
            <div class="panel__legend">
              <span class="legend-dot legend-dot--user"></span>
              <span>用户消息</span>
              <span class="legend-dot legend-dot--assistant"></span>
              <span>AI 回复</span>
            </div>
          </div>

          <div v-if="hasActivityData" ref="activityChartRef" class="chart-box chart-box--activity"></div>
          <div v-else class="panel-empty">最近 7 天还没有聊天数据。</div>
        </article>

        <article class="panel panel--score">
          <div class="panel__header">
            <div>
              <p class="panel__eyebrow">近 30 天</p>
              <h2 class="panel__title">练习得分趋势</h2>
            </div>
            <strong class="panel__badge">{{ practiceAvgScore }}</strong>
          </div>

          <div v-if="hasScoreData" ref="scoreChartRef" class="chart-box chart-box--score"></div>
          <div v-else class="panel-empty">还没有可展示的练习记录。</div>
        </article>
      </section>

      <section class="analytics-grid analytics-grid--bottom">
        <article class="panel panel--docs">
          <div class="panel__header">
            <div>
              <p class="panel__eyebrow">知识库结构</p>
              <h2 class="panel__title">文档类型分布</h2>
            </div>
            <span class="panel__meta">{{ docTypeTotal }} 类</span>
          </div>

          <div v-if="hasDocTypeData" ref="docTypeChartRef" class="chart-box chart-box--donut"></div>
          <div v-else class="panel-empty">暂无导入文档，导入后会自动生成分布图。</div>
        </article>

        <article class="panel panel--list">
          <div class="panel__header">
            <div>
              <p class="panel__eyebrow">最近导入</p>
              <h2 class="panel__title">知识文档</h2>
            </div>
            <span class="panel__meta">{{ recentDocuments.length }} 条</span>
          </div>

          <ul v-if="recentDocuments.length" class="entity-list">
            <li v-for="doc in recentDocuments" :key="doc.id" class="entity-list__item">
              <div class="entity-list__body">
                <strong class="entity-list__title">{{ doc.name }}</strong>
                <span class="entity-list__desc">{{ doc.sourceType }} · {{ formatSize(doc.sizeBytes) }}</span>
              </div>
              <time class="entity-list__time">{{ formatDate(doc.createdAt) }}</time>
            </li>
          </ul>
          <div v-else class="panel-empty">暂无最近导入文档。</div>
        </article>

        <article class="panel panel--list">
          <div class="panel__header">
            <div>
              <p class="panel__eyebrow">最近会话</p>
              <h2 class="panel__title">学习上下文</h2>
            </div>
            <span class="panel__meta">{{ recentSessions.length }} 条</span>
          </div>

          <ul v-if="recentSessions.length" class="entity-list">
            <li v-for="session in recentSessions" :key="session.id" class="entity-list__item">
              <div class="entity-list__body">
                <strong class="entity-list__title">{{ session.title }}</strong>
                <span class="entity-list__desc">{{ session.messageCount }} 条消息</span>
              </div>
              <time class="entity-list__time">{{ formatDate(session.updatedAt) }}</time>
            </li>
          </ul>
          <div v-else class="panel-empty">暂无最近会话。</div>
        </article>
      </section>
    </template>

    <div v-else class="analytics-empty">
      <p class="analytics-empty__title">还没有可用的学习数据</p>
      <span class="analytics-empty__desc">
        开始聊天、导入知识库或提交练习答案后，这里会自动生成学习仪表盘。
      </span>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import * as echarts from "echarts/core";
import { LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { fetchAnalytics } from "@/services/api.js";
import { useThemeStore } from "@/stores/theme.js";

echarts.use([LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const themeStore = useThemeStore();

const analytics = ref(null);
const loading = ref(false);

const activityChartRef = ref(null);
const scoreChartRef = ref(null);
const docTypeChartRef = ref(null);

let activityChart = null;
let scoreChart = null;
let docTypeChart = null;

const counts = computed(() => analytics.value?.counts || {});
const recentDocuments = computed(() => analytics.value?.recentDocuments || []);
const recentSessions = computed(() => analytics.value?.recentSessions || []);
const practiceSummary = computed(() => analytics.value?.practiceSummary || {});

const hasActivityData = computed(() => (analytics.value?.dailyActivity || []).length > 0);
const hasScoreData = computed(() => (analytics.value?.scoreTrend || []).length > 0);
const hasDocTypeData = computed(() => (analytics.value?.docTypeDistribution || []).length > 0);
const docTypeTotal = computed(() => (analytics.value?.docTypeDistribution || []).length);
const practiceAvgScore = computed(() => {
  const avg = Number(practiceSummary.value?.avgScore || 0);
  return avg ? `均分 ${avg}` : "暂无均分";
});

const primaryCards = computed(() => [
  {
    label: "聊天会话",
    value: counts.value.sessions ?? 0,
    hint: `累计消息 ${counts.value.messages ?? 0} 条`,
    tone: "blue"
  },
  {
    label: "知识文档",
    value: counts.value.documents ?? 0,
    hint: `总容量 ${formatSize(counts.value.totalDocSizeBytes ?? 0)}`,
    tone: "emerald"
  },
  {
    label: "练习题",
    value: counts.value.questions ?? 0,
    hint: `已提交答案 ${counts.value.answers ?? 0} 次`,
    tone: "amber"
  },
  {
    label: "学习资源",
    value: counts.value.resources ?? 0,
    hint: `学习计划 ${counts.value.plans ?? 0} 份`,
    tone: "slate"
  }
]);

const secondaryCards = computed(() => [
  { label: "用户消息", value: counts.value.userMessages ?? 0 },
  { label: "AI 回复", value: counts.value.assistantMessages ?? 0 },
  { label: "知识库", value: counts.value.knowledgeBases ?? 0 },
  { label: "智能体", value: counts.value.agents ?? 0 },
  { label: "收藏", value: counts.value.bookmarks ?? 0 }
]);

function buildAxisColor() {
  return themeStore.isDark ? "#94a3b8" : "#64748b";
}

function buildSplitLineColor() {
  return themeStore.isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.08)";
}

function buildActivityChart(data) {
  if (!activityChartRef.value || !data?.length) {
    activityChart?.dispose();
    activityChart = null;
    return null;
  }

  activityChart?.dispose();
  const chart = echarts.init(activityChartRef.value);

  chart.setOption({
    animationDuration: 400,
    color: ["#2563eb", "#22c55e"],
    tooltip: {
      trigger: "axis",
      backgroundColor: themeStore.isDark ? "#0f172a" : "#ffffff",
      borderColor: themeStore.isDark ? "#334155" : "#dbe5f0",
      textStyle: { color: themeStore.isDark ? "#e2e8f0" : "#0f172a" }
    },
    legend: { show: false },
    grid: { left: 18, right: 18, top: 18, bottom: 12, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((item) => item.day),
      axisLine: { lineStyle: { color: buildSplitLineColor() } },
      axisTick: { show: false },
      axisLabel: { color: buildAxisColor() }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: buildAxisColor() },
      splitLine: { lineStyle: { color: buildSplitLineColor() } }
    },
    series: [
      {
        name: "用户消息",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { color: "rgba(37, 99, 235, 0.10)" },
        data: data.map((item) => Number(item.user_count || 0))
      },
      {
        name: "AI 回复",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { color: "rgba(34, 197, 94, 0.08)" },
        data: data.map((item) => Number(item.assistant_count || 0))
      }
    ]
  });

  return chart;
}

function buildScoreChart(data) {
  if (!scoreChartRef.value || !data?.length) {
    scoreChart?.dispose();
    scoreChart = null;
    return null;
  }

  scoreChart?.dispose();
  const chart = echarts.init(scoreChartRef.value);

  chart.setOption({
    animationDuration: 400,
    tooltip: {
      trigger: "axis",
      formatter: (params) => `${params[0].axisValue}<br/>均分：${params[0].value}`,
      backgroundColor: themeStore.isDark ? "#0f172a" : "#ffffff",
      borderColor: themeStore.isDark ? "#334155" : "#dbe5f0",
      textStyle: { color: themeStore.isDark ? "#e2e8f0" : "#0f172a" }
    },
    grid: { left: 18, right: 18, top: 18, bottom: 18, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((item) => item.day),
      axisLine: { lineStyle: { color: buildSplitLineColor() } },
      axisTick: { show: false },
      axisLabel: { color: buildAxisColor() }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: buildAxisColor() },
      splitLine: { lineStyle: { color: buildSplitLineColor() } }
    },
    series: [
      {
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 3, color: "#8b5cf6" },
        itemStyle: { color: "#8b5cf6" },
        areaStyle: { color: "rgba(139, 92, 246, 0.12)" },
        data: data.map((item) => Number(item.avg_score || 0))
      }
    ]
  });

  return chart;
}

function buildDocTypeChart(distribution) {
  if (!docTypeChartRef.value || !distribution?.length) {
    docTypeChart?.dispose();
    docTypeChart = null;
    return null;
  }

  docTypeChart?.dispose();
  const chart = echarts.init(docTypeChartRef.value);

  chart.setOption({
    animationDuration: 400,
    tooltip: {
      trigger: "item",
      formatter: "{b}<br/>{c} 份 · {d}%",
      backgroundColor: themeStore.isDark ? "#0f172a" : "#ffffff",
      borderColor: themeStore.isDark ? "#334155" : "#dbe5f0",
      textStyle: { color: themeStore.isDark ? "#e2e8f0" : "#0f172a" }
    },
    legend: {
      bottom: 0,
      left: "center",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: buildAxisColor() }
    },
    series: [
      {
        type: "pie",
        radius: ["52%", "76%"],
        center: ["50%", "46%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: distribution.map((item) => ({
          name: item.type || "unknown",
          value: Number(item.count || 0)
        }))
      }
    ]
  });

  return chart;
}

function rebuildCharts() {
  if (!analytics.value) {
    return;
  }

  activityChart = buildActivityChart(analytics.value.dailyActivity || []);
  scoreChart = buildScoreChart(analytics.value.scoreTrend || []);
  docTypeChart = buildDocTypeChart(analytics.value.docTypeDistribution || []);
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
    rebuildCharts();
  } catch {
    analytics.value = null;
    activityChart?.dispose();
    scoreChart?.dispose();
    docTypeChart?.dispose();
    activityChart = null;
    scoreChart = null;
    docTypeChart = null;
  } finally {
    loading.value = false;
  }
}

function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(input) {
  if (!input) {
    return "--";
  }

  const value = new Date(input);
  if (Number.isNaN(value.getTime())) {
    return "--";
  }

  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

watch(
  () => themeStore.resolved,
  () => {
    rebuildCharts();
  }
);

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
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 4px 0 32px;
}

.analytics-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 30px;
  margin-bottom: 20px;
  border: 1px solid var(--border-primary);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 32%),
    linear-gradient(135deg, var(--bg-surface), var(--bg-surface-alt));
  box-shadow: var(--shadow-card);
}

.analytics-hero__eyebrow,
.panel__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.analytics-hero__title {
  margin: 0;
  max-width: 760px;
  font-size: 32px;
  line-height: 1.2;
  color: var(--text-primary);
}

.analytics-hero__subtitle {
  margin: 14px 0 0;
  max-width: 760px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.analytics-refresh {
  border: 0;
  border-radius: 14px;
  padding: 12px 18px;
  min-width: 108px;
  font-weight: 700;
  color: var(--text-inverse);
  background: var(--brand-blue);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease;
}

.analytics-refresh:hover:not(:disabled) {
  transform: translateY(-1px);
  background: var(--brand-blue-hover);
}

.analytics-refresh:disabled {
  opacity: 0.72;
  cursor: default;
}

.analytics-loading {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.analytics-loading__card {
  height: 164px;
  border-radius: 24px;
  background: linear-gradient(90deg, var(--bg-surface), var(--bg-surface-alt), var(--bg-surface));
  background-size: 200% 100%;
  animation: analytics-loading 1.2s linear infinite;
}

.analytics-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.overview-card {
  padding: 22px 22px 20px;
  border-radius: 24px;
  border: 1px solid var(--border-primary);
  background: var(--bg-surface);
  box-shadow: var(--shadow-card);
}

.overview-card--blue {
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.08), var(--bg-surface));
}

.overview-card--emerald {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.08), var(--bg-surface));
}

.overview-card--amber {
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), var(--bg-surface));
}

.overview-card--slate {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.05), var(--bg-surface));
}

.overview-card__label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.overview-card__value {
  display: block;
  font-size: 36px;
  line-height: 1;
  color: var(--text-primary);
}

.overview-card__hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

.analytics-summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-primary);
  background: var(--bg-surface);
  box-shadow: var(--shadow-card);
}

.summary-chip__label {
  font-size: 12px;
  color: var(--text-secondary);
}

.summary-chip__value {
  font-size: 14px;
  color: var(--text-primary);
}

.analytics-grid {
  display: grid;
  gap: 18px;
}

.analytics-grid--top {
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.95fr);
  margin-bottom: 18px;
}

.analytics-grid--bottom {
  grid-template-columns: minmax(280px, 0.95fr) minmax(0, 1fr) minmax(0, 1fr);
}

.panel {
  min-width: 0;
  padding: 24px;
  border-radius: 26px;
  border: 1px solid var(--border-primary);
  background: var(--bg-surface);
  box-shadow: var(--shadow-card);
}

.panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel__title {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  color: var(--text-primary);
}

.panel__meta,
.panel__legend {
  font-size: 13px;
  color: var(--text-secondary);
}

.panel__legend {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot--user {
  background: #2563eb;
}

.legend-dot--assistant {
  background: #22c55e;
}

.panel__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  color: #7c3aed;
  background: rgba(139, 92, 246, 0.12);
}

.chart-box {
  width: 100%;
}

.chart-box--activity,
.chart-box--score {
  height: 340px;
}

.chart-box--donut {
  height: 310px;
}

.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 20px;
  border-radius: 20px;
  background: var(--bg-surface-alt);
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.7;
}

.entity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.entity-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 18px;
  background: var(--bg-surface-alt);
}

.entity-list__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.entity-list__title {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-list__desc,
.entity-list__time {
  font-size: 12px;
  color: var(--text-secondary);
}

.entity-list__time {
  flex-shrink: 0;
}

.analytics-empty {
  padding: 72px 24px;
  border: 1px solid var(--border-primary);
  border-radius: 28px;
  background: var(--bg-surface);
  text-align: center;
  box-shadow: var(--shadow-card);
}

.analytics-empty__title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.analytics-empty__desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}

@keyframes analytics-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 1180px) {
  .analytics-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analytics-grid--top,
  .analytics-grid--bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .analytics-hero {
    flex-direction: column;
    padding: 22px;
  }

  .analytics-hero__title {
    font-size: 26px;
  }

  .analytics-loading,
  .analytics-overview {
    grid-template-columns: 1fr;
  }
}
</style>
