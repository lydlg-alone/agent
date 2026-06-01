<template>
  <div class="knowledge-page">
    <section class="knowledge-hero">
      <div>
        <span class="eyebrow">Knowledge Base</span>
        <h1>知识库管理</h1>
        <p>用图表查看文档规模、类型结构、导入节奏和知识库覆盖情况，让资料沉淀状态一眼可见。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="loadAll">刷新数据</el-button>
        <el-button type="primary" @click="createDialogVisible = true">新建知识库</el-button>
      </div>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <span>知识库数</span>
        <strong>{{ knowledgeBases.length }}</strong>
        <p>{{ activeBaseCount }} 个处于可用状态</p>
      </article>
      <article class="metric-card">
        <span>文档总数</span>
        <strong>{{ documents.length }}</strong>
        <p>覆盖 {{ typeSegments.length || 0 }} 种资料类型</p>
      </article>
      <article class="metric-card">
        <span>累计容量</span>
        <strong>{{ formatSize(totalSize) }}</strong>
        <p>已切分 {{ totalChunks }} 个检索片段</p>
      </article>
      <article class="metric-card">
        <span>最近导入</span>
        <strong class="metric-card__title">{{ latestDocument?.name || "暂无文档" }}</strong>
        <p>{{ latestDocument ? formatDate(latestDocument.createdAt) : "导入资料后开始统计" }}</p>
      </article>
    </section>

    <section class="chart-grid">
      <article class="chart-card chart-card--wide">
        <div class="chart-card__header">
          <div>
            <h2>知识库文档分布</h2>
            <p>按知识库聚合文档数量，便于发现资料集中度。</p>
          </div>
        </div>
        <div ref="baseBarRef" class="chart-box"></div>
      </article>

      <article class="chart-card">
        <div class="chart-card__header">
          <div>
            <h2>资料类型占比</h2>
            <p>根据文件来源类型统计。</p>
          </div>
        </div>
        <div ref="typePieRef" class="chart-box"></div>
      </article>

      <article class="chart-card">
        <div class="chart-card__header">
          <div>
            <h2>容量结构</h2>
            <p>按类型汇总文件体积。</p>
          </div>
        </div>
        <div ref="sizeBarRef" class="chart-box"></div>
      </article>

      <article class="chart-card chart-card--wide">
        <div class="chart-card__header">
          <div>
            <h2>近 7 日导入趋势</h2>
            <p>观察知识库增长节奏，避免资料堆积后集中处理。</p>
          </div>
        </div>
        <div ref="trendRef" class="chart-box chart-box--short"></div>
      </article>
    </section>

    <section class="management-grid">
      <article class="panel-card">
        <div class="panel-card__header">
          <div>
            <h2>知识库清单</h2>
            <p>查看每个知识库的分类、检索引擎与文档规模。</p>
          </div>
        </div>
        <el-table :data="knowledgeBases" stripe height="360" empty-text="暂无知识库">
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" effect="light">
                {{ row.status === "active" ? "可用" : row.status || "未知" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="检索引擎" min-width="150">
            <template #default="{ row }">{{ row.vector_store || row.vectorStore || "本地检索" }}</template>
          </el-table-column>
          <el-table-column label="文档数" width="100" align="right">
            <template #default="{ row }">{{ row.document_count ?? row.documentCount ?? 0 }}</template>
          </el-table-column>
        </el-table>
      </article>

      <article class="panel-card">
        <div class="panel-card__header panel-card__header--inline">
          <div>
            <h2>文档检索</h2>
            <p>{{ documentSummary }}</p>
          </div>
          <el-input v-model="search" clearable placeholder="搜索文档名称" class="document-search" />
        </div>
        <el-table :data="filteredDocuments" stripe height="360" empty-text="暂无文档">
          <el-table-column prop="name" label="文档" min-width="190" show-overflow-tooltip />
          <el-table-column label="知识库" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.knowledgeBaseName || "默认知识库" }}</template>
          </el-table-column>
          <el-table-column label="类型" width="90">
            <template #default="{ row }">
              <el-tag effect="plain">{{ normalizeType(row.sourceType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="110" align="right">
            <template #default="{ row }">{{ formatSize(row.sizeBytes) }}</template>
          </el-table-column>
          <el-table-column label="导入时间" width="150">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </article>
    </section>

    <el-dialog v-model="createDialogVisible" title="新建知识库" width="520px">
      <el-form :model="form" label-position="top">
        <el-form-item label="知识库名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="form.category" />
        </el-form-item>
        <el-form-item label="检索引擎">
          <el-input v-model="form.vectorStore" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitKnowledgeBase">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import * as echarts from "echarts";
import { api, fetchKnowledgeBases, fetchKnowledgeDocuments } from "@/services/api.js";

const knowledgeBases = ref([]);
const documents = ref([]);
const search = ref("");
const loading = ref(false);
const submitting = ref(false);
const createDialogVisible = ref(false);

const baseBarRef = ref(null);
const typePieRef = ref(null);
const sizeBarRef = ref(null);
const trendRef = ref(null);
const charts = [];

const form = reactive({
  name: "新知识库",
  category: "通用",
  vectorStore: "SQLite FTS5",
  description: "用于存储课程资料、学习笔记和练习解析。",
  status: "active"
});

const totalSize = computed(() => documents.value.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0));
const totalChunks = computed(() => documents.value.reduce((sum, item) => sum + Number(item.chunkCount || 0), 0));
const activeBaseCount = computed(() => knowledgeBases.value.filter((item) => item.status === "active").length);
const latestDocument = computed(() => documents.value[0] || null);

const filteredDocuments = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) {
    return documents.value;
  }
  return documents.value.filter((doc) => doc.name?.toLowerCase().includes(keyword));
});

const documentSummary = computed(() => {
  if (!documents.value.length) {
    return "导入文档后会在这里形成可检索清单。";
  }
  if (search.value.trim()) {
    return `已筛选出 ${filteredDocuments.value.length} 份文档`;
  }
  return `共 ${documents.value.length} 份文档，累计 ${formatSize(totalSize.value)}`;
});

const typeSegments = computed(() => {
  const segments = new Map();
  documents.value.forEach((doc) => {
    const type = normalizeType(doc.sourceType);
    const current = segments.get(type) || { name: type, count: 0, size: 0 };
    current.count += 1;
    current.size += Number(doc.sizeBytes || 0);
    segments.set(type, current);
  });
  return Array.from(segments.values()).sort((a, b) => b.count - a.count);
});

const baseSegments = computed(() =>
  knowledgeBases.value.map((base) => ({
    name: base.name,
    value: Number(base.document_count ?? base.documentCount ?? 0)
  }))
);

const trendSegments = computed(() => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = toDateKey(date);
    return { key, label: `${date.getMonth() + 1}/${date.getDate()}`, value: 0 };
  });
  const byKey = new Map(days.map((item) => [item.key, item]));
  documents.value.forEach((doc) => {
    const key = toDateKey(new Date(doc.createdAt));
    if (byKey.has(key)) {
      byKey.get(key).value += 1;
    }
  });
  return days;
});

async function loadAll() {
  loading.value = true;
  try {
    const [bases, docs] = await Promise.all([fetchKnowledgeBases(), fetchKnowledgeDocuments()]);
    knowledgeBases.value = bases;
    documents.value = docs;
    await nextTick();
    renderCharts();
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || "加载知识库数据失败");
  } finally {
    loading.value = false;
  }
}

async function submitKnowledgeBase() {
  if (!form.name.trim()) {
    ElMessage.warning("请输入知识库名称");
    return;
  }

  submitting.value = true;
  try {
    await api.post("/knowledge-bases", form);
    ElMessage.success("知识库已创建");
    createDialogVisible.value = false;
    await loadAll();
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || "创建知识库失败");
  } finally {
    submitting.value = false;
  }
}

function renderCharts() {
  if (!baseBarRef.value || !typePieRef.value || !sizeBarRef.value || !trendRef.value) {
    return;
  }

  const palette = ["#0ea5e9", "#10b981", "#f59e0b", "#ef5d7a", "#647ce8", "#14b8a6"];
  const textColor = getCssVar("--text-secondary");
  const gridLine = "rgba(84, 178, 230, 0.18)";

  const baseBar = getChart(baseBarRef);
  baseBar.setOption({
    color: palette,
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 18, top: 28, bottom: 48 },
    xAxis: {
      type: "category",
      data: baseSegments.value.map((item) => item.name),
      axisLabel: { color: textColor, interval: 0, overflow: "truncate", width: 90 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridLine } }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridLine } }
    },
    series: [
      {
        type: "bar",
        data: baseSegments.value.map((item) => item.value),
        barWidth: 28,
        itemStyle: { borderRadius: [8, 8, 0, 0] },
        label: { show: true, position: "top", color: getCssVar("--text-primary") }
      }
    ]
  });

  const typePie = getChart(typePieRef);
  typePie.setOption({
    color: palette,
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: textColor } },
    series: [
      {
        type: "pie",
        radius: ["48%", "70%"],
        center: ["50%", "44%"],
        data: withEmpty(typeSegments.value.map((item) => ({ name: item.name, value: item.count }))),
        label: { color: getCssVar("--text-primary"), formatter: "{b}" },
        itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 }
      }
    ]
  });

  const sizeBar = getChart(sizeBarRef);
  sizeBar.setOption({
    color: ["#10b981"],
    tooltip: {
      trigger: "axis",
      formatter: (params) => `${params[0].name}<br/>${formatSize(params[0].value)}`
    },
    grid: { left: 48, right: 16, top: 28, bottom: 42 },
    xAxis: {
      type: "category",
      data: typeSegments.value.map((item) => item.name),
      axisLabel: { color: textColor },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridLine } }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: textColor, formatter: (value) => formatCompactSize(value) },
      splitLine: { lineStyle: { color: gridLine } }
    },
    series: [
      {
        type: "bar",
        data: typeSegments.value.map((item) => item.size),
        barWidth: 26,
        itemStyle: { borderRadius: [8, 8, 0, 0] }
      }
    ]
  });

  const trend = getChart(trendRef);
  trend.setOption({
    color: ["#0ea5e9"],
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 18, top: 28, bottom: 36 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trendSegments.value.map((item) => item.label),
      axisLabel: { color: textColor },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridLine } }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridLine } }
    },
    series: [
      {
        type: "line",
        smooth: true,
        symbolSize: 8,
        areaStyle: { color: "rgba(14, 165, 233, 0.14)" },
        lineStyle: { width: 3 },
        data: trendSegments.value.map((item) => item.value)
      }
    ]
  });
}

function getChart(targetRef) {
  let chart = echarts.getInstanceByDom(targetRef.value);
  if (!chart) {
    chart = echarts.init(targetRef.value);
    charts.push(chart);
  }
  return chart;
}

function withEmpty(data) {
  return data.length ? data : [{ name: "暂无数据", value: 1, itemStyle: { color: "rgba(122, 147, 166, 0.24)" } }];
}

function normalizeType(type) {
  return String(type || "file").replace(/^\./, "").toUpperCase();
}

function formatSize(value = 0) {
  const size = Number(value || 0);
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}

function formatCompactSize(value = 0) {
  const size = Number(value || 0);
  if (size >= 1024 * 1024) {
    return `${Math.round(size / 1024 / 1024)}M`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)}K`;
  }
  return String(size);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toDateKey(date) {
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function resizeCharts() {
  charts.forEach((chart) => chart.resize());
}

watch([knowledgeBases, documents], () => nextTick(renderCharts), { deep: true });

onMounted(() => {
  loadAll();
  window.addEventListener("resize", resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeCharts);
  charts.forEach((chart) => chart.dispose());
});
</script>

<style scoped>
.knowledge-page {
  min-height: 100vh;
  padding: 32px;
  color: var(--text-primary);
}

.knowledge-hero {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  color: var(--brand-blue);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.knowledge-hero h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.18;
}

.knowledge-hero p {
  max-width: 680px;
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.metric-grid,
.chart-grid,
.management-grid {
  display: grid;
  gap: 16px;
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 16px;
}

.metric-card,
.chart-card,
.panel-card {
  background: var(--bg-overlay-strong);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(12px);
}

.metric-card {
  min-height: 126px;
  padding: 18px;
  border-radius: 18px;
}

.metric-card span,
.chart-card p,
.panel-card p {
  color: var(--text-secondary);
}

.metric-card span {
  font-size: 13px;
}

.metric-card strong {
  display: block;
  margin-top: 12px;
  color: var(--text-primary);
  font-size: 30px;
  line-height: 1.1;
}

.metric-card__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 20px !important;
}

.metric-card p {
  margin: 10px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
}

.chart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 16px;
}

.chart-card,
.panel-card {
  padding: 20px;
  border-radius: 20px;
}

.chart-card--wide {
  grid-column: span 2;
}

.chart-card__header,
.panel-card__header {
  margin-bottom: 12px;
}

.chart-card h2,
.panel-card h2 {
  margin: 0;
  font-size: 18px;
}

.chart-card p,
.panel-card p {
  margin: 6px 0 0;
  font-size: 13px;
}

.chart-box {
  width: 100%;
  height: 290px;
}

.chart-box--short {
  height: 240px;
}

.management-grid {
  grid-template-columns: minmax(340px, 0.86fr) minmax(420px, 1.14fr);
}

.panel-card__header--inline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.document-search {
  width: 220px;
  flex-shrink: 0;
}

:deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(232, 246, 255, 0.72);
  border-radius: 14px;
  overflow: hidden;
}

:deep(.el-button) {
  border-radius: 12px;
}

@media (max-width: 1180px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .management-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .knowledge-page {
    padding: 20px;
  }

  .knowledge-hero,
  .panel-card__header--inline {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions {
    width: 100%;
  }

  .hero-actions :deep(.el-button) {
    flex: 1;
  }

  .metric-grid,
  .chart-grid {
    grid-template-columns: 1fr;
  }

  .chart-card--wide {
    grid-column: span 1;
  }

  .document-search {
    width: 100%;
  }
}
</style>
