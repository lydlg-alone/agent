<template>
  <section class="analytics-dashboard">
    <header class="analytics-hero">
      <div class="analytics-hero__titles">
        <p class="analytics-hero__eyebrow">Analytics</p>
        <h1 class="analytics-hero__title">学习仪表盘</h1>
      </div>

      <div class="analytics-hero__actions">
        <span v-if="analytics" class="analytics-hero__badge">{{ headlineBadge }}</span>
        <button class="analytics-refresh" type="button" :disabled="loading" @click="loadData">
          {{ loading ? "刷新中..." : "刷新数据" }}
        </button>
      </div>
    </header>

    <div v-if="loading && !analytics" class="analytics-loading">
      <div v-for="index in 4" :key="index" class="analytics-loading__card"></div>
    </div>

    <template v-else-if="analytics">
      <section class="analytics-kpi-grid">
        <article v-for="card in kpiCards" :key="card.key" class="dashboard-card dashboard-card--metric">
          <div class="dashboard-card__header dashboard-card__header--tight">
            <div>
              <p class="dashboard-card__eyebrow">{{ card.eyebrow }}</p>
              <h2 class="dashboard-card__title dashboard-card__title--small">{{ card.title }}</h2>
            </div>
            <span class="dashboard-card__badge dashboard-card__badge--muted">{{ card.badge }}</span>
          </div>

          <div :ref="bindMetricRef(card.key)" class="chart-box chart-box--metric"></div>
        </article>
      </section>

      <section class="analytics-grid analytics-grid--main">
        <article class="dashboard-card dashboard-card--wide">
          <div class="dashboard-card__header">
            <div>
              <p class="dashboard-card__eyebrow">Conversation</p>
              <h2 class="dashboard-card__title">近 7 天对话活跃度</h2>
            </div>
            <div class="dashboard-card__legend">
              <span class="legend-dot legend-dot--blue"></span>
              <span>用户消息</span>
              <span class="legend-dot legend-dot--teal"></span>
              <span>AI 回复</span>
            </div>
          </div>

          <div v-if="hasActivityData" ref="activityChartRef" class="chart-box chart-box--line"></div>
          <div v-else class="dashboard-card__empty">最近 7 天还没有聊天数据。</div>
        </article>

        <article class="dashboard-card">
          <div class="dashboard-card__header">
            <div>
              <p class="dashboard-card__eyebrow">Practice</p>
              <h2 class="dashboard-card__title">近 30 天得分趋势</h2>
            </div>
            <span class="dashboard-card__badge">{{ practiceBadge }}</span>
          </div>

          <div v-if="hasScoreData" ref="scoreChartRef" class="chart-box chart-box--line"></div>
          <div v-else class="dashboard-card__empty">还没有可展示的练习记录。</div>
        </article>
      </section>

      <section class="analytics-grid analytics-grid--detail">
        <article class="dashboard-card">
          <div class="dashboard-card__header">
            <div>
              <p class="dashboard-card__eyebrow">Knowledge</p>
              <h2 class="dashboard-card__title">文档类型分布</h2>
            </div>
            <span class="dashboard-card__badge dashboard-card__badge--muted">{{ docTypeBadge }}</span>
          </div>

          <div v-if="hasDocTypeData" ref="docTypeChartRef" class="chart-box chart-box--donut"></div>
          <div v-else class="dashboard-card__empty">暂无导入文档，导入后会自动生成分布图。</div>
        </article>

        <article class="dashboard-card">
          <div class="dashboard-card__header">
            <div>
              <p class="dashboard-card__eyebrow">Documents</p>
              <h2 class="dashboard-card__title">最近资料体量</h2>
            </div>
            <span class="dashboard-card__badge dashboard-card__badge--muted">{{ recentDocuments.length }} 条</span>
          </div>

          <div v-if="hasRecentDocumentData" ref="recentDocsChartRef" class="chart-box chart-box--bar"></div>
          <div v-else class="dashboard-card__empty">暂无最近导入文档。</div>
        </article>

        <article class="dashboard-card">
          <div class="dashboard-card__header">
            <div>
              <p class="dashboard-card__eyebrow">Sessions</p>
              <h2 class="dashboard-card__title">最近会话消息规模</h2>
            </div>
            <span class="dashboard-card__badge dashboard-card__badge--muted">{{ recentSessions.length }} 条</span>
          </div>

          <div v-if="hasRecentSessionData" ref="recentSessionsChartRef" class="chart-box chart-box--bar"></div>
          <div v-else class="dashboard-card__empty">暂无最近会话。</div>
        </article>
      </section>
    </template>

    <div v-else class="analytics-empty">
      <p class="analytics-empty__title">还没有可用的学习数据</p>
      <span class="analytics-empty__desc">开始聊天、导入知识库或提交练习答案后，这里会自动生成图表仪表盘。</span>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GraphicComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { fetchAnalytics } from "@/services/api.js";
import { useThemeStore } from "@/stores/theme.js";

echarts.use([BarChart, LineChart, PieChart, GraphicComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const palette = ["#005fb8", "#0c78da", "#1bb6a8", "#f59e0b", "#7c5cff", "#1f2937"];

const themeStore = useThemeStore();

const analytics = ref(null);
const loading = ref(false);

const activityChartRef = ref(null);
const scoreChartRef = ref(null);
const docTypeChartRef = ref(null);
const recentDocsChartRef = ref(null);
const recentSessionsChartRef = ref(null);

const metricRefs = new Map();
const metricCharts = new Map();

let activityChart = null;
let scoreChart = null;
let docTypeChart = null;
let recentDocsChart = null;
let recentSessionsChart = null;

const counts = computed(() => analytics.value?.counts || {});
const practiceSummary = computed(() => analytics.value?.practiceSummary || {});
const recentDocuments = computed(() => analytics.value?.recentDocuments || []);
const recentSessions = computed(() => analytics.value?.recentSessions || []);

const hasActivityData = computed(() => (analytics.value?.dailyActivity || []).length > 0);
const hasScoreData = computed(() => (analytics.value?.scoreTrend || []).length > 0);
const hasDocTypeData = computed(() => (analytics.value?.docTypeDistribution || []).length > 0);
const hasRecentDocumentData = computed(() => recentDocuments.value.length > 0);
const hasRecentSessionData = computed(() => recentSessions.value.length > 0);

const practiceBadge = computed(() => {
  const avg = Number(practiceSummary.value?.avgScore || 0);
  return avg ? `均分 ${avg}` : "暂无均分";
});

const headlineBadge = computed(() => `总消息 ${counts.value.messages ?? 0} · 文档 ${counts.value.documents ?? 0}`);
const docTypeBadge = computed(() => `${(analytics.value?.docTypeDistribution || []).length} 类`);

const kpiCards = computed(() => [
  {
    key: "messages",
    eyebrow: "消息结构",
    title: "用户与 AI 占比",
    badge: `${counts.value.messages ?? 0} 条`,
    centerText: `${counts.value.messages ?? 0}`,
    footer: "总消息",
    series: [
      { name: "用户消息", value: Number(counts.value.userMessages || 0) },
      { name: "AI 回复", value: Number(counts.value.assistantMessages || 0) }
    ]
  },
  {
    key: "knowledge",
    eyebrow: "知识沉淀",
    title: "知识库与文档",
    badge: formatSize(counts.value.totalDocSizeBytes ?? 0),
    centerText: `${counts.value.documents ?? 0}`,
    footer: "文档数",
    series: [
      { name: "知识文档", value: Number(counts.value.documents || 0) },
      { name: "知识库", value: Number(counts.value.knowledgeBases || 0) }
    ]
  },
  {
    key: "practice",
    eyebrow: "练习进度",
    title: "题目与已答次数",
    badge: `${counts.value.answers ?? 0} 次`,
    centerText: `${counts.value.questions ?? 0}`,
    footer: "题目数",
    series: [
      { name: "练习题", value: Number(counts.value.questions || 0) },
      { name: "已答题", value: Number(counts.value.answers || 0) }
    ]
  },
  {
    key: "assets",
    eyebrow: "学习资产",
    title: "计划、资源与智能体",
    badge: `${counts.value.resources ?? 0} 份`,
    centerText: `${counts.value.plans ?? 0}`,
    footer: "计划数",
    series: [
      { name: "学习计划", value: Number(counts.value.plans || 0) },
      { name: "学习资源", value: Number(counts.value.resources || 0) },
      { name: "智能体", value: Number(counts.value.agents || 0) }
    ]
  }
]);

function bindMetricRef(key) {
  return (element) => {
    if (element) {
      metricRefs.set(key, element);
      return;
    }
    metricRefs.delete(key);
  };
}

function axisColor() {
  return themeStore.isDark ? "#94a3b8" : "#64748b";
}

function splitLineColor() {
  return themeStore.isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.08)";
}

function panelBackground() {
  return themeStore.isDark ? "#0f172a" : "#ffffff";
}

function panelBorder() {
  return themeStore.isDark ? "#334155" : "#dbe5f0";
}

function baseTooltip() {
  return {
    backgroundColor: panelBackground(),
    borderColor: panelBorder(),
    textStyle: { color: themeStore.isDark ? "#e2e8f0" : "#0f172a" }
  };
}

function buildMetricChart(card) {
  const element = metricRefs.get(card.key);
  if (!element) {
    return null;
  }

  metricCharts.get(card.key)?.dispose();
  const chart = echarts.init(element);

  chart.setOption({
    animationDuration: 360,
    color: palette,
    tooltip: {
      trigger: "item",
      ...baseTooltip()
    },
    series: [
      {
        type: "pie",
        radius: ["56%", "78%"],
        center: ["50%", "52%"],
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderColor: panelBackground(),
          borderWidth: 4
        },
        data: card.series.map((item) => ({
          name: item.name,
          value: Math.max(Number(item.value || 0), 0.0001)
        }))
      }
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "40%",
        style: {
          text: card.centerText,
          fill: themeStore.isDark ? "#f8fafc" : "#0f172a",
          fontSize: 28,
          fontWeight: 700,
          textAlign: "center"
        }
      },
      {
        type: "text",
        left: "center",
        top: "58%",
        style: {
          text: card.footer,
          fill: axisColor(),
          fontSize: 12,
          textAlign: "center"
        }
      }
    ]
  });

  metricCharts.set(card.key, chart);
  return chart;
}

function buildActivityChart(rows) {
  if (!activityChartRef.value || !rows?.length) {
    activityChart?.dispose();
    activityChart = null;
    return null;
  }

  activityChart?.dispose();
  const chart = echarts.init(activityChartRef.value);

  chart.setOption({
    animationDuration: 420,
    color: [palette[0], palette[2]],
    tooltip: {
      trigger: "axis",
      ...baseTooltip()
    },
    grid: { left: 20, right: 20, top: 20, bottom: 14, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: rows.map((item) => item.day),
      axisLine: { lineStyle: { color: splitLineColor() } },
      axisTick: { show: false },
      axisLabel: { color: axisColor() }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisColor() },
      splitLine: { lineStyle: { color: splitLineColor() } }
    },
    series: [
      {
        name: "用户消息",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { color: "rgba(0, 95, 184, 0.10)" },
        data: rows.map((item) => Number(item.user_count || 0))
      },
      {
        name: "AI 回复",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { color: "rgba(27, 182, 168, 0.10)" },
        data: rows.map((item) => Number(item.assistant_count || 0))
      }
    ]
  });

  return chart;
}

function buildScoreChart(rows) {
  if (!scoreChartRef.value || !rows?.length) {
    scoreChart?.dispose();
    scoreChart = null;
    return null;
  }

  scoreChart?.dispose();
  const chart = echarts.init(scoreChartRef.value);

  chart.setOption({
    animationDuration: 420,
    tooltip: {
      trigger: "axis",
      formatter: (params) => `${params[0].axisValue}<br/>均分：${params[0].value}`,
      ...baseTooltip()
    },
    grid: { left: 20, right: 20, top: 20, bottom: 14, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: rows.map((item) => item.day),
      axisLine: { lineStyle: { color: splitLineColor() } },
      axisTick: { show: false },
      axisLabel: { color: axisColor() }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisColor() },
      splitLine: { lineStyle: { color: splitLineColor() } }
    },
    series: [
      {
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 3, color: palette[4] },
        itemStyle: { color: palette[4] },
        areaStyle: { color: "rgba(124, 92, 255, 0.12)" },
        data: rows.map((item) => Number(item.avg_score || 0))
      }
    ]
  });

  return chart;
}

function buildDocTypeChart(rows) {
  if (!docTypeChartRef.value || !rows?.length) {
    docTypeChart?.dispose();
    docTypeChart = null;
    return null;
  }

  docTypeChart?.dispose();
  const chart = echarts.init(docTypeChartRef.value);

  chart.setOption({
    animationDuration: 360,
    color: palette,
    tooltip: {
      trigger: "item",
      formatter: "{b}<br/>{c} 份 · {d}%",
      ...baseTooltip()
    },
    legend: {
      bottom: 0,
      left: "center",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: axisColor() }
    },
    series: [
      {
        type: "pie",
        radius: ["52%", "76%"],
        center: ["50%", "45%"],
        label: { show: false },
        labelLine: { show: false },
        data: rows.map((item) => ({
          name: item.type || "unknown",
          value: Number(item.count || 0)
        }))
      }
    ]
  });

  return chart;
}

function buildRecentDocsChart(items) {
  if (!recentDocsChartRef.value || !items?.length) {
    recentDocsChart?.dispose();
    recentDocsChart = null;
    return null;
  }

  recentDocsChart?.dispose();
  const chart = echarts.init(recentDocsChartRef.value);
  const labels = items.map((item) => truncateLabel(item.name, 14)).reverse();
  const values = items.map((item) => Number(item.sizeBytes || 0) / 1024).reverse();

  chart.setOption({
    animationDuration: 360,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => `${params[0].name}<br/>${params[0].value.toFixed(1)} KB`,
      ...baseTooltip()
    },
    grid: { left: 20, right: 20, top: 14, bottom: 14, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: axisColor(), formatter: (value) => `${value} KB` },
      splitLine: { lineStyle: { color: splitLineColor() } }
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisColor() }
    },
    series: [
      {
        type: "bar",
        barWidth: 18,
        itemStyle: {
          color: palette[1],
          borderRadius: [0, 10, 10, 0]
        },
        data: values
      }
    ]
  });

  return chart;
}

function buildRecentSessionsChart(items) {
  if (!recentSessionsChartRef.value || !items?.length) {
    recentSessionsChart?.dispose();
    recentSessionsChart = null;
    return null;
  }

  recentSessionsChart?.dispose();
  const chart = echarts.init(recentSessionsChartRef.value);
  const labels = items.map((item) => truncateLabel(item.title, 14)).reverse();
  const values = items.map((item) => Number(item.messageCount || 0)).reverse();

  chart.setOption({
    animationDuration: 360,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => `${params[0].name}<br/>${params[0].value} 条消息`,
      ...baseTooltip()
    },
    grid: { left: 20, right: 20, top: 14, bottom: 14, containLabel: true },
    xAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: axisColor() },
      splitLine: { lineStyle: { color: splitLineColor() } }
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisColor() }
    },
    series: [
      {
        type: "bar",
        barWidth: 18,
        itemStyle: {
          color: palette[3],
          borderRadius: [0, 10, 10, 0]
        },
        data: values
      }
    ]
  });

  return chart;
}

function rebuildCharts() {
  if (!analytics.value) {
    return;
  }

  for (const card of kpiCards.value) {
    buildMetricChart(card);
  }
  activityChart = buildActivityChart(analytics.value.dailyActivity || []);
  scoreChart = buildScoreChart(analytics.value.scoreTrend || []);
  docTypeChart = buildDocTypeChart(analytics.value.docTypeDistribution || []);
  recentDocsChart = buildRecentDocsChart(recentDocuments.value);
  recentSessionsChart = buildRecentSessionsChart(recentSessions.value);
}

function disposeMetricCharts() {
  for (const chart of metricCharts.values()) {
    chart.dispose();
  }
  metricCharts.clear();
}

function resizeCharts() {
  for (const chart of metricCharts.values()) {
    chart.resize();
  }
  activityChart?.resize();
  scoreChart?.resize();
  docTypeChart?.resize();
  recentDocsChart?.resize();
  recentSessionsChart?.resize();
}

async function loadData() {
  loading.value = true;
  try {
    analytics.value = await fetchAnalytics();
    await nextTick();
    rebuildCharts();
  } catch (error) {
    console.error("Failed to load analytics:", error);
    analytics.value = null;
    disposeMetricCharts();
    activityChart?.dispose();
    scoreChart?.dispose();
    docTypeChart?.dispose();
    recentDocsChart?.dispose();
    recentSessionsChart?.dispose();
    activityChart = null;
    scoreChart = null;
    docTypeChart = null;
    recentDocsChart = null;
    recentSessionsChart = null;
  } finally {
    loading.value = false;
  }
}

function truncateLabel(value, maxLength) {
  const text = String(value || "").trim();
  if (!text) {
    return "未命名";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
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
  disposeMetricCharts();
  activityChart?.dispose();
  scoreChart?.dispose();
  docTypeChart?.dispose();
  recentDocsChart?.dispose();
  recentSessionsChart?.dispose();
});
</script>

<style scoped>
.analytics-dashboard {
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding: 8px 0 28px;
}

.analytics-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  margin-bottom: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(0, 95, 184, 0.15), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(238, 246, 255, 0.92));
  box-shadow: 0 18px 40px rgba(0, 95, 184, 0.08);
}

.analytics-hero__titles {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.analytics-hero__eyebrow,
.dashboard-card__eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.analytics-hero__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  color: var(--text-primary);
}

.analytics-hero__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.analytics-hero__badge {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 95, 184, 0.12);
  background: rgba(255, 255, 255, 0.82);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.analytics-refresh {
  border: 0;
  border-radius: 14px;
  padding: 12px 18px;
  min-width: 108px;
  font-weight: 700;
  color: var(--text-inverse);
  background: linear-gradient(135deg, #005fb8, #0c78da);
  box-shadow: 0 10px 24px rgba(0, 95, 184, 0.22);
  cursor: pointer;
  transition: transform 0.16s ease, filter 0.16s ease;
}

.analytics-refresh:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.03);
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
  height: 184px;
  border-radius: 24px;
  background: linear-gradient(90deg, var(--bg-surface), var(--bg-surface-alt), var(--bg-surface));
  background-size: 200% 100%;
  animation: analytics-loading 1.2s linear infinite;
}

.analytics-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.analytics-grid {
  display: grid;
  gap: 16px;
}

.analytics-grid--main {
  grid-template-columns: minmax(0, 1.55fr) minmax(340px, 1fr);
  margin-bottom: 16px;
}

.analytics-grid--detail {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.dashboard-card {
  min-width: 0;
  padding: 20px;
  border-radius: 24px;
  border: 1px solid rgba(220, 232, 245, 0.95);
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.72) inset,
    0 18px 32px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(10px);
}

.dashboard-card--metric {
  padding-top: 18px;
}

.dashboard-card--wide {
  padding-bottom: 18px;
}

.dashboard-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.dashboard-card__header--tight {
  margin-bottom: 6px;
}

.dashboard-card__title {
  margin: 6px 0 0;
  font-size: 20px;
  line-height: 1.22;
  font-weight: 700;
  color: var(--text-primary);
}

.dashboard-card__title--small {
  font-size: 16px;
  line-height: 1.3;
}

.dashboard-card__badge,
.dashboard-card__legend {
  font-size: 13px;
  color: var(--text-secondary);
}

.dashboard-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 10px 14px;
  color: #6d28d9;
  background: rgba(124, 92, 255, 0.10);
  font-weight: 700;
}

.dashboard-card__badge--muted {
  color: var(--text-secondary);
  background: rgba(239, 246, 255, 0.96);
}

.dashboard-card__legend {
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

.legend-dot--blue {
  background: #005fb8;
}

.legend-dot--teal {
  background: #1bb6a8;
}

.chart-box {
  width: 100%;
}

.chart-box--metric {
  height: 182px;
}

.chart-box--line {
  height: 326px;
}

.chart-box--donut,
.chart-box--bar {
  height: 304px;
}

.dashboard-card__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(238, 246, 255, 0.82);
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.7;
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

@media (max-width: 1260px) {
  .analytics-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analytics-grid--main,
  .analytics-grid--detail {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .analytics-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .analytics-hero__actions {
    justify-content: space-between;
  }

  .analytics-hero__title {
    font-size: 24px;
  }

  .analytics-loading,
  .analytics-kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
