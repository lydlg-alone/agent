<template>
  <section class="learning-paths-page">
    <header class="learning-paths-page__hero surface-card">
      <div class="learning-paths-page__hero-main">
        <span class="learning-paths-page__eyebrow">Learning Paths</span>
        <h1>学习路径</h1>
        <p>用图表查看当前学习路径的难度分布和完成进度，并通过卡片快速进入单条路径的弹窗详情。</p>
      </div>

      <div class="learning-paths-page__hero-actions">
        <el-button @click="loadPlans">刷新</el-button>
        <el-button type="primary" @click="openCreateDialog">生成学习路径</el-button>
      </div>
    </header>

    <div v-if="loading && !plans.length" class="learning-paths-page__loading">
      <div v-for="index in 4" :key="index" class="surface-card learning-paths-page__loading-card"></div>
    </div>

    <section v-else-if="!plans.length" class="surface-card learning-paths-page__empty">
      <h2>暂无学习路径</h2>
      <p>当前还没有可展示的学习路径，先生成一条路径后再查看图表和详情。</p>
      <el-button type="primary" @click="openCreateDialog">生成学习路径</el-button>
    </section>

    <template v-else>
      <section class="learning-paths-page__charts">
        <article class="surface-card learning-paths-page__panel">
          <div class="learning-paths-page__panel-head">
            <div>
              <h2>难度分布</h2>
              <p>统计当前学习路径在入门、进阶和高级三个层级的占比。</p>
            </div>
            <span>{{ plans.length }} 条路径</span>
          </div>
          <div ref="difficultyChartRef" class="learning-paths-page__chart learning-paths-page__chart--donut"></div>
        </article>

        <article class="surface-card learning-paths-page__panel">
          <div class="learning-paths-page__panel-head">
            <div>
              <h2>路径进度</h2>
              <p>横向比较每条路径的完成百分比和阶段总数。</p>
            </div>
            <span>按完成度展示</span>
          </div>
          <div ref="progressChartRef" class="learning-paths-page__chart learning-paths-page__chart--bar"></div>
        </article>
      </section>

      <section class="learning-paths-page__cards">
        <article
          v-for="plan in plans"
          :key="plan.id"
          class="surface-card learning-paths-page__card"
          @click="openPlanDialog(plan)"
        >
          <div class="learning-paths-page__card-head">
            <div>
              <div class="learning-paths-page__card-topline">
                <el-tag size="small" :type="difficultyTagType(plan.difficulty)">{{ difficultyLabel(plan.difficulty) }}</el-tag>
                <el-tag v-if="plan.studySetTitle" size="small" effect="plain">{{ plan.studySetTitle }}</el-tag>
              </div>
              <h3>{{ plan.goal }}</h3>
            </div>

            <button type="button" class="learning-paths-page__delete" @click.stop="removePlan(plan.id)">
              删除
            </button>
          </div>

          <p class="learning-paths-page__card-copy">{{ summarize(plan.goal, 88) }}</p>

          <div class="learning-paths-page__card-progress">
            <div class="learning-paths-page__progress-ring">
              <svg viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18"></circle>
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  :style="{ strokeDashoffset: progressOffset(progressPercent(plan)) }"
                ></circle>
              </svg>
              <strong>{{ progressPercent(plan) }}%</strong>
            </div>

            <div class="learning-paths-page__progress-meta">
              <div>
                <span>阶段进度</span>
                <strong>{{ completedCount(plan) }}/{{ stageCount(plan) }}</strong>
              </div>
              <div>
                <span>创建日期</span>
                <strong>{{ formatDate(plan.created_at) }}</strong>
              </div>
            </div>
          </div>

          <div class="learning-paths-page__stage-preview">
            <span
              v-for="(stage, index) in parsedStages(plan).slice(0, 3)"
              :key="`${plan.id}-${index}`"
              class="learning-paths-page__stage-chip"
            >
              {{ stage.title || `阶段 ${index + 1}` }}
            </span>
            <span v-if="stageCount(plan) > 3" class="learning-paths-page__stage-chip learning-paths-page__stage-chip--muted">
              +{{ stageCount(plan) - 3 }}
            </span>
          </div>
        </article>
      </section>
    </template>

    <el-dialog v-model="dialog.visible" title="AI 生成学习路径" width="560px">
      <el-form label-position="top">
        <el-form-item label="学习目标">
          <el-input
            v-model="dialog.form.goal"
            maxlength="200"
            placeholder="例如：两周内完成操作系统核心知识梳理并形成复习节奏"
          />
        </el-form-item>
        <el-form-item label="关联学习集">
          <el-select
            v-model="dialog.form.studySetId"
            placeholder="可选，选择后会把学习集上下文交给 AI"
            clearable
            filterable
            class="learning-paths-page__select"
          >
            <el-option
              v-for="studySet in studySets"
              :key="studySet.id"
              :label="studySet.title"
              :value="studySet.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="难度">
          <el-select v-model="dialog.form.difficulty" class="learning-paths-page__select">
            <el-option label="入门" value="beginner" />
            <el-option label="进阶" value="intermediate" />
            <el-option label="高级" value="advanced" />
          </el-select>
        </el-form-item>
        <p class="learning-paths-page__dialog-hint">
          生成时会调用当前模型配置对应的 AI API。若未配置模型，将无法生成学习路径。
        </p>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.generating" @click="submitDialog">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="planDialog.visible" width="920px" class="learning-paths-page__detail-dialog">
      <template #header>
        <div class="learning-paths-page__dialog-head">
          <div>
            <span class="learning-paths-page__eyebrow">Path Detail</span>
            <h2>{{ selectedPlan?.goal || "学习路径详情" }}</h2>
            <p>
              {{ difficultyLabel(selectedPlan?.difficulty) }} · {{ selectedPlanStages.length }} 个阶段 ·
              {{ selectedPlanCompletedCount }}/{{ selectedPlanStages.length }} 已完成
            </p>
          </div>
        </div>
      </template>

      <div v-if="selectedPlan" class="learning-paths-page__dialog-body">
        <div class="learning-paths-page__dialog-grid">
          <section class="surface-card learning-paths-page__dialog-panel">
            <div class="learning-paths-page__panel-head">
              <div>
                <h3>阶段概览</h3>
                <p>用环图查看当前路径已完成与未完成阶段。</p>
              </div>
              <span>{{ selectedPlanProgress }}%</span>
            </div>
            <div ref="detailChartRef" class="learning-paths-page__chart learning-paths-page__chart--detail"></div>
          </section>

          <section class="surface-card learning-paths-page__dialog-panel">
            <div class="learning-paths-page__panel-head">
              <div>
                <h3>路径摘要</h3>
                <p>查看这条路径的目标、创建时间、建议节奏和关联学习集。</p>
              </div>
            </div>

            <dl class="learning-paths-page__summary-list">
              <div>
                <dt>学习目标</dt>
                <dd>{{ selectedPlan.goal }}</dd>
              </div>
              <div>
                <dt>难度等级</dt>
                <dd>{{ difficultyLabel(selectedPlan.difficulty) }}</dd>
              </div>
              <div>
                <dt>关联学习集</dt>
                <dd>{{ selectedPlan.studySetTitle || "未关联" }}</dd>
              </div>
              <div>
                <dt>创建日期</dt>
                <dd>{{ formatDate(selectedPlan.created_at) }}</dd>
              </div>
              <div>
                <dt>建议节奏</dt>
                <dd>{{ suggestedCadence(selectedPlanStages.length, selectedPlan.difficulty) }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section class="surface-card learning-paths-page__timeline">
          <div class="learning-paths-page__panel-head">
            <div>
              <h3>阶段时间线</h3>
              <p>逐阶段查看当前路径的任务内容和完成状态。</p>
            </div>
          </div>

          <div class="learning-paths-page__timeline-list">
            <article
              v-for="(stage, index) in selectedPlanStages"
              :key="`${selectedPlan.id}-${index}`"
              class="learning-paths-page__timeline-item"
              :class="{ 'learning-paths-page__timeline-item--done': stage.completed }"
            >
              <div class="learning-paths-page__timeline-index">{{ stage.completed ? "✓" : index + 1 }}</div>
              <div class="learning-paths-page__timeline-content">
                <div class="learning-paths-page__timeline-top">
                  <h4>{{ stage.title || `阶段 ${index + 1}` }}</h4>
                  <el-tag size="small" :type="stage.completed ? 'success' : 'info'">
                    {{ stage.completed ? "已完成" : "进行中" }}
                  </el-tag>
                </div>
                <p>{{ stage.description || "暂无阶段描述" }}</p>
                <div class="learning-paths-page__timeline-meta">
                  <span v-if="stage.type">{{ stage.type }}</span>
                  <span v-if="stage.duration">{{ stage.duration }}</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import * as echarts from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, fetchStudySets } from "@/services/api.js";

echarts.use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const palette = ["#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#6366f1"];
const RING_CIRCUMFERENCE = 2 * Math.PI * 18;

const plans = ref([]);
const studySets = ref([]);
const loading = ref(false);
const selectedPlan = ref(null);

const difficultyChartRef = ref(null);
const progressChartRef = ref(null);
const detailChartRef = ref(null);

let difficultyChart = null;
let progressChart = null;
let detailChart = null;

const dialog = reactive({
  visible: false,
  generating: false,
  form: { goal: "", difficulty: "intermediate", studySetId: "" }
});

const planDialog = reactive({
  visible: false
});

const selectedPlanStages = computed(() => (selectedPlan.value ? parsedStages(selectedPlan.value) : []));
const selectedPlanCompletedCount = computed(() => selectedPlanStages.value.filter((stage) => stage.completed).length);
const selectedPlanProgress = computed(() => {
  const total = selectedPlanStages.value.length;
  return total ? Math.round((selectedPlanCompletedCount.value / total) * 100) : 0;
});

function parsedStages(plan) {
  if (Array.isArray(plan?.stages)) {
    return plan.stages;
  }

  try {
    const stages = JSON.parse(plan?.stages_json || "[]");
    return Array.isArray(stages) ? stages : [];
  } catch {
    return [];
  }
}

function stageCount(plan) {
  return parsedStages(plan).length;
}

function completedCount(plan) {
  return parsedStages(plan).filter((stage) => stage.completed).length;
}

function progressPercent(plan) {
  const total = stageCount(plan);
  return total ? Math.round((completedCount(plan) / total) * 100) : 0;
}

function progressOffset(percent) {
  return RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * percent) / 100;
}

function summarize(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "暂无描述";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function difficultyLabel(value) {
  return (
    {
      beginner: "入门",
      intermediate: "进阶",
      advanced: "高级"
    }[value] || value || "未分类"
  );
}

function difficultyTagType(value) {
  return (
    {
      beginner: "success",
      intermediate: "warning",
      advanced: "danger"
    }[value] || "info"
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function suggestedCadence(stageTotal, difficulty) {
  if (difficulty === "advanced") {
    return `${Math.max(stageTotal * 2, 10)} 天强化节奏`;
  }
  if (difficulty === "beginner") {
    return `${Math.max(stageTotal * 4, 14)} 天缓进节奏`;
  }
  return `${Math.max(stageTotal * 3, 12)} 天均衡节奏`;
}

function buildDifficultySeries() {
  const counts = new Map();

  for (const plan of plans.value) {
    const key = difficultyLabel(plan.difficulty);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

function buildProgressSeries() {
  return [...plans.value]
    .map((plan) => ({
      name: summarize(plan.goal, 16),
      value: progressPercent(plan)
    }))
    .sort((left, right) => right.value - left.value);
}

function renderDifficultyChart() {
  if (!difficultyChartRef.value) {
    return;
  }

  difficultyChart?.dispose();
  difficultyChart = echarts.init(difficultyChartRef.value);
  difficultyChart.setOption({
    color: palette,
    tooltip: { trigger: "item" },
    legend: {
      bottom: 0,
      icon: "circle",
      textStyle: { color: "#49677d" }
    },
    series: [
      {
        type: "pie",
        radius: ["48%", "72%"],
        center: ["50%", "44%"],
        label: { show: false },
        data: buildDifficultySeries()
      }
    ]
  });
}

function renderProgressChart() {
  if (!progressChartRef.value) {
    return;
  }

  progressChart?.dispose();
  progressChart = echarts.init(progressChartRef.value);
  const series = buildProgressSeries();

  progressChart.setOption({
    color: ["#0ea5e9"],
    grid: {
      top: 12,
      right: 12,
      bottom: 20,
      left: 120
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" }
    },
    xAxis: {
      type: "value",
      max: 100,
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
      axisLabel: {
        color: "#6b7c93",
        formatter: "{value}%"
      }
    },
    yAxis: {
      type: "category",
      data: series.map((item) => item.name),
      axisLabel: { color: "#16324f" },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        type: "bar",
        data: series.map((item) => item.value),
        barWidth: 18,
        itemStyle: {
          borderRadius: [0, 10, 10, 0],
          color: (params) => palette[params.dataIndex % palette.length]
        }
      }
    ]
  });
}

function renderDetailChart() {
  if (!detailChartRef.value || !selectedPlan.value) {
    return;
  }

  detailChart?.dispose();
  detailChart = echarts.init(detailChartRef.value);
  detailChart.setOption({
    color: ["#10b981", "#dbeafe"],
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: ["52%", "74%"],
        center: ["50%", "46%"],
        label: {
          color: "#16324f",
          formatter: "{b}\n{c}"
        },
        data: [
          { name: "已完成", value: selectedPlanCompletedCount.value },
          { name: "待完成", value: Math.max(selectedPlanStages.value.length - selectedPlanCompletedCount.value, 0) }
        ]
      }
    ]
  });
}

function resizeCharts() {
  difficultyChart?.resize();
  progressChart?.resize();
  detailChart?.resize();
}

async function loadPlans() {
  loading.value = true;
  try {
    const { data } = await api.get("/learning-plans");
    plans.value = Array.isArray(data) ? data : [];
    await nextTick();

    if (plans.value.length) {
      renderDifficultyChart();
      renderProgressChart();
    } else {
      difficultyChart?.dispose();
      difficultyChart = null;
      progressChart?.dispose();
      progressChart = null;
    }
  } finally {
    loading.value = false;
  }
}

async function loadStudySets() {
  studySets.value = await fetchStudySets();
}

async function openCreateDialog() {
  if (!studySets.value.length) {
    try {
      await loadStudySets();
    } catch {
      ElMessage.error("学习集列表加载失败");
    }
  }

  dialog.visible = true;
  dialog.form = { goal: "", difficulty: "intermediate", studySetId: "" };
}

async function submitDialog() {
  if (!dialog.form.goal.trim()) {
    ElMessage.warning("请输入学习目标");
    return;
  }

  dialog.generating = true;
  try {
    await api.post("/workflows/plan", {
      goal: dialog.form.goal.trim(),
      difficulty: dialog.form.difficulty,
      studySetId: dialog.form.studySetId || ""
    });
    dialog.visible = false;
    ElMessage.success("已生成学习路径");
    await loadPlans();
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || "生成失败");
  } finally {
    dialog.generating = false;
  }
}

async function removePlan(id) {
  try {
    await ElMessageBox.confirm("确认删除这条学习路径？", "删除确认", { type: "warning" });
    await api.delete(`/learning-plans/${id}`);
    ElMessage.success("已删除");

    if (selectedPlan.value?.id === id) {
      planDialog.visible = false;
      selectedPlan.value = null;
    }

    await loadPlans();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败");
    }
  }
}

async function openPlanDialog(plan) {
  selectedPlan.value = plan;

  try {
    const { data } = await api.get(`/learning-plans/${plan.id}`);
    selectedPlan.value = data;
  } catch {
    selectedPlan.value = plan;
  }

  planDialog.visible = true;
  await nextTick();
  renderDetailChart();
}

onMounted(async () => {
  await loadPlans();
  try {
    await loadStudySets();
  } catch {
    studySets.value = [];
  }
  window.addEventListener("resize", resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeCharts);
  difficultyChart?.dispose();
  progressChart?.dispose();
  detailChart?.dispose();
});
</script>

<style scoped>
.learning-paths-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.surface-card {
  border-radius: 28px;
  border: 1px solid var(--border-light);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(235, 248, 255, 0.78)),
    var(--bg-overlay-strong);
  box-shadow: var(--shadow-card);
}

.learning-paths-page__hero,
.learning-paths-page__hero-actions,
.learning-paths-page__panel-head,
.learning-paths-page__card-head,
.learning-paths-page__card-topline,
.learning-paths-page__card-progress,
.learning-paths-page__dialog-head,
.learning-paths-page__timeline-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.learning-paths-page__hero {
  justify-content: space-between;
  padding: 28px 30px;
}

.learning-paths-page__hero-main {
  max-width: 760px;
}

.learning-paths-page__eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  color: var(--brand-blue);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.learning-paths-page__hero h1,
.learning-paths-page__panel-head h2,
.learning-paths-page__panel-head h3,
.learning-paths-page__card-head h3,
.learning-paths-page__dialog-head h2,
.learning-paths-page__timeline-top h4,
.learning-paths-page__empty h2 {
  margin: 0;
}

.learning-paths-page__hero p,
.learning-paths-page__panel-head p,
.learning-paths-page__card-copy,
.learning-paths-page__dialog-head p,
.learning-paths-page__timeline-item p,
.learning-paths-page__empty p,
.learning-paths-page__dialog-hint {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.72;
}

.learning-paths-page__hero-actions {
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.learning-paths-page__loading,
.learning-paths-page__charts,
.learning-paths-page__cards,
.learning-paths-page__dialog-grid,
.learning-paths-page__timeline-list {
  display: grid;
  gap: 16px;
}

.learning-paths-page__loading {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.learning-paths-page__loading-card {
  min-height: 148px;
}

.learning-paths-page__empty,
.learning-paths-page__panel,
.learning-paths-page__timeline,
.learning-paths-page__dialog-panel {
  padding: 22px;
}

.learning-paths-page__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.learning-paths-page__charts {
  grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
}

.learning-paths-page__panel-head {
  justify-content: space-between;
  margin-bottom: 18px;
}

.learning-paths-page__panel-head span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.learning-paths-page__chart {
  width: 100%;
}

.learning-paths-page__chart--donut,
.learning-paths-page__chart--detail,
.learning-paths-page__chart--bar {
  height: 280px;
}

.learning-paths-page__cards {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.learning-paths-page__card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.learning-paths-page__card:hover {
  transform: translateY(-3px);
  border-color: var(--brand-blue-border);
  box-shadow: var(--shadow-elevated);
}

.learning-paths-page__card-head {
  align-items: flex-start;
  justify-content: space-between;
}

.learning-paths-page__card-topline {
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.learning-paths-page__delete {
  padding: 0;
  border: 0;
  background: transparent;
  color: #f43f5e;
  cursor: pointer;
}

.learning-paths-page__card-progress {
  justify-content: space-between;
}

.learning-paths-page__progress-ring {
  position: relative;
  width: 78px;
  height: 78px;
  flex-shrink: 0;
}

.learning-paths-page__progress-ring svg {
  width: 78px;
  height: 78px;
  transform: rotate(-90deg);
}

.learning-paths-page__progress-ring circle {
  fill: none;
  stroke-width: 4;
}

.learning-paths-page__progress-ring circle:first-child {
  stroke: rgba(148, 163, 184, 0.18);
}

.learning-paths-page__progress-ring circle:last-child {
  stroke: #0ea5e9;
  stroke-linecap: round;
  stroke-dasharray: 113.1;
  transition: stroke-dashoffset 0.3s ease;
}

.learning-paths-page__progress-ring strong {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 16px;
}

.learning-paths-page__progress-meta {
  flex: 1;
  display: grid;
  gap: 12px;
}

.learning-paths-page__progress-meta span {
  display: block;
  color: var(--text-tertiary);
  font-size: 12px;
}

.learning-paths-page__progress-meta strong {
  display: block;
  margin-top: 6px;
  color: var(--text-primary);
  font-size: 15px;
}

.learning-paths-page__stage-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.learning-paths-page__stage-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-secondary);
  font-size: 12px;
}

.learning-paths-page__stage-chip--muted {
  color: var(--text-tertiary);
}

.learning-paths-page__select {
  width: 100%;
}

.learning-paths-page__dialog-hint {
  font-size: 13px;
}

.learning-paths-page__dialog-head {
  align-items: flex-start;
  justify-content: space-between;
}

.learning-paths-page__dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.learning-paths-page__dialog-grid {
  grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
}

.learning-paths-page__summary-list {
  display: grid;
  gap: 14px;
  margin: 0;
}

.learning-paths-page__summary-list dt {
  margin-bottom: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.learning-paths-page__summary-list dd {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.7;
}

.learning-paths-page__timeline-list {
  grid-template-columns: 1fr;
}

.learning-paths-page__timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 0;
  border-top: 1px solid var(--border-light);
}

.learning-paths-page__timeline-item:first-child {
  border-top: 0;
  padding-top: 0;
}

.learning-paths-page__timeline-item--done {
  opacity: 0.72;
}

.learning-paths-page__timeline-index {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(14, 165, 233, 0.12);
  color: var(--brand-blue);
  font-weight: 700;
}

.learning-paths-page__timeline-item--done .learning-paths-page__timeline-index {
  background: rgba(16, 185, 129, 0.16);
  color: #059669;
}

.learning-paths-page__timeline-content {
  flex: 1;
  min-width: 0;
}

.learning-paths-page__timeline-top {
  justify-content: space-between;
  margin-bottom: 8px;
}

.learning-paths-page__timeline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
}

@media (max-width: 1280px) {
  .learning-paths-page__loading {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .learning-paths-page__charts,
  .learning-paths-page__dialog-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .learning-paths-page__hero,
  .learning-paths-page__hero-actions,
  .learning-paths-page__panel-head,
  .learning-paths-page__card-head,
  .learning-paths-page__card-progress,
  .learning-paths-page__dialog-head,
  .learning-paths-page__timeline-top {
    align-items: flex-start;
    flex-direction: column;
  }

  .learning-paths-page__loading {
    grid-template-columns: 1fr;
  }

  .learning-paths-page__hero,
  .learning-paths-page__empty,
  .learning-paths-page__panel,
  .learning-paths-page__timeline,
  .learning-paths-page__dialog-panel {
    padding: 18px;
  }
}
</style>
