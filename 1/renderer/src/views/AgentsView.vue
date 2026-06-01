<template>
  <section class="agents-page">
    <header class="surface-card agents-page__hero">
      <div class="agents-page__hero-main">
        <span class="agents-page__eyebrow">Orchestration</span>
        <h1>智能体编排</h1>
        <p>用图表查看当前学习工作流中的规划、检索和专家输出关系。页面重点改为“观察编排”和“切换当前专家”，不再堆叠创建表单。</p>
      </div>

      <div class="agents-page__hero-actions">
        <span class="agents-page__hero-badge">{{ headlineBadge }}</span>
        <el-button :loading="loading" @click="loadData">刷新编排</el-button>
      </div>
    </header>

    <div v-if="loading && !agents.length" class="agents-page__loading">
      <div v-for="index in 4" :key="index" class="surface-card agents-page__loading-card"></div>
    </div>

    <template v-else>
      <section class="agents-page__stats">
        <article v-for="card in statCards" :key="card.key" class="surface-card agents-page__stat-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <p>{{ card.description }}</p>
        </article>
      </section>

      <section class="agents-page__grid">
        <article class="surface-card agents-page__panel agents-page__panel--flow">
          <div class="agents-page__panel-head">
            <div>
              <h2>协同流程图</h2>
              <p>展示用户任务如何流经规划、检索和当前激活的专家智能体。</p>
            </div>
            <span>{{ activeAgent?.name || "未激活专家" }}</span>
          </div>

          <div ref="orchestrationChartRef" class="agents-page__chart agents-page__chart--flow"></div>

          <div class="agents-page__stage-pills">
            <span v-for="step in workflowSteps" :key="step.key" class="agents-page__stage-pill">
              <strong>{{ step.title }}</strong>
              <small>{{ step.caption }}</small>
            </span>
          </div>
        </article>

        <aside class="agents-page__side-stack">
          <article class="surface-card agents-page__panel">
            <div class="agents-page__panel-head">
              <div>
                <h2>模型分布</h2>
                <p>当前智能体绑定的模型家族占比。</p>
              </div>
              <span>{{ distinctModelCount }} 种</span>
            </div>
            <div ref="modelChartRef" class="agents-page__chart agents-page__chart--donut"></div>
          </article>

          <article class="surface-card agents-page__panel">
            <div class="agents-page__panel-head">
              <div>
                <h2>角色分布</h2>
                <p>编排层与专家层的角色构成。</p>
              </div>
              <span>{{ agents.length }} 个节点</span>
            </div>
            <div ref="roleChartRef" class="agents-page__chart agents-page__chart--bar"></div>
          </article>
        </aside>
      </section>

      <section class="agents-page__bottom">
        <article class="surface-card agents-page__panel">
          <div class="agents-page__panel-head">
            <div>
              <h2>专家智能体</h2>
              <p>选择当前面向用户输出的专家角色，图表会同步更新高亮路径。</p>
            </div>
            <span>{{ marketAgents.length }} 个可切换</span>
          </div>

          <div class="agents-page__agent-grid">
            <article
              v-for="agent in marketAgents"
              :key="agent.id"
              class="agents-page__agent-card"
              :class="{ 'agents-page__agent-card--active': isActiveAgent(agent) }"
            >
              <div class="agents-page__agent-head">
                <div>
                  <div class="agents-page__agent-role">{{ roleLabel(agent.role) }}</div>
                  <h3>{{ agent.name }}</h3>
                </div>
                <el-tag :type="isActiveAgent(agent) ? 'success' : 'info'" size="small">
                  {{ isActiveAgent(agent) ? "当前激活" : "候选专家" }}
                </el-tag>
              </div>

              <div class="agents-page__agent-tags">
                <span class="agents-page__meta-chip">{{ agent.modelBinding || "未绑定模型" }}</span>
                <span class="agents-page__meta-chip">{{ agent.createdAt ? formatDate(agent.createdAt) : "新建智能体" }}</span>
              </div>

              <p class="agents-page__agent-copy">{{ summarize(agent.promptTemplate, 96) }}</p>
              <p class="agents-page__agent-scope">{{ summarize(agent.knowledgeScope, 88) }}</p>

              <div class="agents-page__agent-actions">
                <el-button
                  type="primary"
                  plain
                  :disabled="isActiveAgent(agent)"
                  :loading="switchingAgentId === agent.id"
                  @click="handleActivateAgent(agent.id)"
                >
                  {{ isActiveAgent(agent) ? "已激活" : "设为当前专家" }}
                </el-button>
              </div>
            </article>
          </div>
        </article>

        <article class="surface-card agents-page__panel">
          <div class="agents-page__panel-head">
            <div>
              <h2>编排层说明</h2>
              <p>系统层智能体负责拆解任务和调度知识，专家层负责最终学习输出。</p>
            </div>
            <span>{{ systemAgents.length }} 个系统节点</span>
          </div>

          <div class="agents-page__system-list">
            <article v-for="agent in systemAgents" :key="agent.id" class="agents-page__system-card">
              <div class="agents-page__system-top">
                <strong>{{ agent.name }}</strong>
                <span>{{ roleLabel(agent.role) }}</span>
              </div>
              <p>{{ summarize(agent.promptTemplate, 120) }}</p>
              <small>{{ summarize(agent.knowledgeScope, 96) }}</small>
            </article>
          </div>
        </article>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import * as echarts from "echarts/core";
import { BarChart, GraphChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ElMessage } from "element-plus";
import { activateAgent, fetchActiveAgent, fetchAgents } from "@/services/api.js";

echarts.use([BarChart, GraphChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const palette = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#f43f5e", "#1f2937"];

const loading = ref(false);
const switchingAgentId = ref("");
const agents = ref([]);
const activeAgent = ref(null);

const orchestrationChartRef = ref(null);
const modelChartRef = ref(null);
const roleChartRef = ref(null);

let orchestrationChart = null;
let modelChart = null;
let roleChart = null;

const systemAgents = computed(() => agents.value.filter((agent) => agent.isSystem));
const marketAgents = computed(() => agents.value.filter((agent) => !agent.isSystem));
const distinctModelCount = computed(() => new Set(agents.value.map((agent) => agent.modelBinding || "未绑定")).size);
const activeAgentId = computed(() => activeAgent.value?.id || "");

const headlineBadge = computed(() => `当前激活：${activeAgent.value?.name || "未选择"}`);

const statCards = computed(() => [
  {
    key: "total",
    label: "编排节点",
    value: agents.value.length,
    description: "包含系统协同层与用户可切换专家层"
  },
  {
    key: "market",
    label: "专家智能体",
    value: marketAgents.value.length,
    description: "面向用户输出结果的候选角色"
  },
  {
    key: "system",
    label: "系统层",
    value: systemAgents.value.length,
    description: "负责规划、检索与工作流调度"
  },
  {
    key: "models",
    label: "模型家族",
    value: distinctModelCount.value,
    description: "当前智能体绑定的模型种类"
  }
]);

const workflowSteps = computed(() => [
  { key: "input", title: "用户任务", caption: "进入学习工作流" },
  { key: "planning", title: "规划层", caption: findAgentName("planning") || "拆解目标与步骤" },
  { key: "retrieval", title: "检索层", caption: findAgentName("retrieval") || "聚合知识上下文" },
  { key: "expert", title: "专家层", caption: activeAgent.value?.name || "选择当前输出专家" },
  { key: "output", title: "学习输出", caption: "返回讲解、计划或练习" }
]);

function roleLabel(role) {
  return (
    {
      general: "通用学习",
      politics: "政治辅导",
      coding: "代码辅导",
      planning: "学习规划",
      retrieval: "知识检索"
    }[role] || role || "未分类"
  );
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function summarize(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "暂无描述";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function isActiveAgent(agent) {
  return agent?.id === activeAgentId.value;
}

function findAgentByRole(role) {
  return agents.value.find((agent) => agent.role === role) || null;
}

function findAgentName(role) {
  return findAgentByRole(role)?.name || "";
}

function buildModelSeries() {
  const counts = new Map();
  for (const agent of agents.value) {
    const key = agent.modelBinding || "未绑定";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

function buildRoleSeries() {
  const counts = new Map();

  for (const agent of agents.value) {
    const key = roleLabel(agent.role);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

function renderOrchestrationChart() {
  if (!orchestrationChartRef.value) {
    return;
  }

  orchestrationChart?.dispose();
  orchestrationChart = echarts.init(orchestrationChartRef.value);

  const planningAgent = findAgentByRole("planning");
  const retrievalAgent = findAgentByRole("retrieval");
  const specialists = marketAgents.value;
  const specialistGap = specialists.length > 1 ? 220 / (specialists.length - 1) : 0;

  const nodes = [
    {
      id: "task-input",
      name: "用户任务",
      kind: "stage",
      x: 40,
      y: 160,
      symbolSize: 58,
      itemStyle: { color: "#0ea5e9" },
      label: { formatter: "用户任务\nTask" }
    },
    {
      id: "output",
      name: "学习输出",
      kind: "stage",
      x: 760,
      y: 160,
      symbolSize: 58,
      itemStyle: { color: "#10b981" },
      label: { formatter: "学习输出\nOutput" }
    }
  ];

  const links = [];

  if (planningAgent) {
    nodes.push({
      id: planningAgent.id,
      name: planningAgent.name,
      kind: "agent",
      role: planningAgent.role,
      modelBinding: planningAgent.modelBinding,
      knowledgeScope: planningAgent.knowledgeScope,
      x: 220,
      y: 90,
      symbolSize: 70,
      itemStyle: { color: "#6366f1" },
      label: { formatter: `${planningAgent.name}\n${roleLabel(planningAgent.role)}` }
    });
    links.push({
      source: "task-input",
      target: planningAgent.id,
      lineStyle: { color: "#91caff", width: 3, opacity: 0.9 }
    });
  }

  if (retrievalAgent) {
    nodes.push({
      id: retrievalAgent.id,
      name: retrievalAgent.name,
      kind: "agent",
      role: retrievalAgent.role,
      modelBinding: retrievalAgent.modelBinding,
      knowledgeScope: retrievalAgent.knowledgeScope,
      x: 220,
      y: 245,
      symbolSize: 70,
      itemStyle: { color: "#f59e0b" },
      label: { formatter: `${retrievalAgent.name}\n${roleLabel(retrievalAgent.role)}` }
    });
    links.push({
      source: planningAgent?.id || "task-input",
      target: retrievalAgent.id,
      lineStyle: { color: "#f7c97b", width: 3, opacity: 0.9 }
    });
  }

  specialists.forEach((agent, index) => {
    const active = isActiveAgent(agent);
    const y = specialists.length === 1 ? 160 : 50 + specialistGap * index;
    nodes.push({
      id: agent.id,
      name: agent.name,
      kind: "agent",
      role: agent.role,
      modelBinding: agent.modelBinding,
      knowledgeScope: agent.knowledgeScope,
      x: 500,
      y,
      symbolSize: active ? 84 : 68,
      itemStyle: { color: active ? "#10b981" : "#94a3b8" },
      label: { formatter: `${agent.name}\n${roleLabel(agent.role)}` }
    });

    if (planningAgent) {
      links.push({
        source: planningAgent.id,
        target: agent.id,
        lineStyle: {
          color: active ? "#7dd3fc" : "rgba(148, 163, 184, 0.38)",
          width: active ? 3 : 2,
          opacity: active ? 1 : 0.75,
          type: active ? "solid" : "dashed"
        }
      });
    }

    if (retrievalAgent && active) {
      links.push({
        source: retrievalAgent.id,
        target: agent.id,
        lineStyle: { color: "#10b981", width: 4, opacity: 0.95 }
      });
    }

    if (active) {
      links.push({
        source: agent.id,
        target: "output",
        lineStyle: { color: "#10b981", width: 4, opacity: 0.95 }
      });
    }
  });

  orchestrationChart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        if (params.dataType === "edge") {
          return "协同连接";
        }

        const data = params.data || {};
        if (data.kind === "agent") {
          return [
            `<strong>${data.name}</strong>`,
            `角色：${roleLabel(data.role)}`,
            `模型：${data.modelBinding || "未绑定"}`,
            `知识范围：${data.knowledgeScope || "未设置"}`
          ].join("<br/>");
        }
        return `<strong>${data.name}</strong>`;
      }
    },
    series: [
      {
        type: "graph",
        layout: "none",
        roam: true,
        coordinateSystem: null,
        data: nodes,
        links,
        lineStyle: {
          curveness: 0.12
        },
        label: {
          show: true,
          position: "bottom",
          color: "#16324f",
          fontSize: 12,
          lineHeight: 18
        },
        emphasis: {
          focus: "adjacency",
          scale: true
        }
      }
    ]
  });
}

function renderModelChart() {
  if (!modelChartRef.value) {
    return;
  }

  modelChart?.dispose();
  modelChart = echarts.init(modelChartRef.value);

  modelChart.setOption({
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
        data: buildModelSeries()
      }
    ]
  });
}

function renderRoleChart() {
  if (!roleChartRef.value) {
    return;
  }

  roleChart?.dispose();
  roleChart = echarts.init(roleChartRef.value);

  const series = buildRoleSeries();

  roleChart.setOption({
    color: ["#0ea5e9"],
    grid: {
      top: 10,
      right: 12,
      bottom: 10,
      left: 92
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" }
    },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
      axisLabel: { color: "#6b7c93" }
    },
    yAxis: {
      type: "category",
      data: series.map((item) => item.name),
      axisLabel: { color: "#16324f" },
      axisTick: { show: false },
      axisLine: { show: false }
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

function renderCharts() {
  renderOrchestrationChart();
  renderModelChart();
  renderRoleChart();
}

function resizeCharts() {
  orchestrationChart?.resize();
  modelChart?.resize();
  roleChart?.resize();
}

async function loadData() {
  loading.value = true;
  try {
    const [agentList, currentActive] = await Promise.all([fetchAgents(), fetchActiveAgent()]);
    agents.value = agentList || [];
    activeAgent.value = currentActive || agentList.find((item) => !item.isSystem) || null;
    await nextTick();
    renderCharts();
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "读取智能体编排失败");
  } finally {
    loading.value = false;
  }
}

async function handleActivateAgent(agentId) {
  if (!agentId || switchingAgentId.value) {
    return;
  }

  switchingAgentId.value = agentId;
  try {
    const nextActive = await activateAgent(agentId);
    activeAgent.value = nextActive;
    await nextTick();
    renderCharts();
    ElMessage.success(`已切换到 ${nextActive.name}`);
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "切换智能体失败");
  } finally {
    switchingAgentId.value = "";
  }
}

onMounted(async () => {
  await loadData();
  window.addEventListener("resize", resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeCharts);
  orchestrationChart?.dispose();
  modelChart?.dispose();
  roleChart?.dispose();
});
</script>

<style scoped>
.agents-page {
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

.agents-page__hero,
.agents-page__hero-actions,
.agents-page__panel-head,
.agents-page__agent-head,
.agents-page__agent-actions,
.agents-page__system-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agents-page__hero {
  justify-content: space-between;
  padding: 28px 30px;
}

.agents-page__hero-main {
  max-width: 760px;
}

.agents-page__eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  color: var(--brand-blue);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.agents-page__hero h1,
.agents-page__panel-head h2,
.agents-page__agent-head h3 {
  margin: 0;
}

.agents-page__hero p,
.agents-page__panel-head p,
.agents-page__stat-card p,
.agents-page__agent-copy,
.agents-page__agent-scope,
.agents-page__system-card p,
.agents-page__system-card small {
  margin: 0;
  color: var(--text-secondary);
}

.agents-page__hero p,
.agents-page__panel-head p,
.agents-page__agent-copy,
.agents-page__agent-scope,
.agents-page__system-card p,
.agents-page__system-card small {
  line-height: 1.72;
}

.agents-page__hero-actions {
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.agents-page__hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.1);
  color: var(--brand-blue);
  font-size: 13px;
  font-weight: 600;
}

.agents-page__loading,
.agents-page__stats,
.agents-page__grid,
.agents-page__bottom,
.agents-page__agent-grid,
.agents-page__system-list,
.agents-page__stage-pills {
  display: grid;
  gap: 16px;
}

.agents-page__loading {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agents-page__loading-card {
  min-height: 132px;
}

.agents-page__stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.agents-page__stat-card,
.agents-page__panel {
  padding: 22px;
}

.agents-page__stat-card span {
  display: block;
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.agents-page__stat-card strong {
  display: block;
  margin: 12px 0 8px;
  color: var(--text-primary);
  font-size: 30px;
  line-height: 1;
}

.agents-page__grid {
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
}

.agents-page__panel-head {
  justify-content: space-between;
  margin-bottom: 18px;
}

.agents-page__panel-head span,
.agents-page__agent-role,
.agents-page__system-top span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.agents-page__panel--flow {
  min-width: 0;
}

.agents-page__side-stack {
  display: grid;
  gap: 16px;
}

.agents-page__chart {
  width: 100%;
}

.agents-page__chart--flow {
  height: 380px;
}

.agents-page__chart--donut,
.agents-page__chart--bar {
  height: 260px;
}

.agents-page__stage-pills {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin-top: 16px;
}

.agents-page__stage-pill {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.72);
}

.agents-page__stage-pill strong,
.agents-page__stage-pill small {
  display: block;
}

.agents-page__stage-pill small {
  margin-top: 6px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.agents-page__bottom {
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
}

.agents-page__agent-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.agents-page__agent-card,
.agents-page__system-card {
  border-radius: 22px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.7);
}

.agents-page__agent-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.agents-page__agent-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-blue-border);
  box-shadow: var(--shadow-elevated);
}

.agents-page__agent-card--active {
  border-color: rgba(16, 185, 129, 0.36);
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.14), transparent 26%),
    rgba(240, 253, 250, 0.88);
}

.agents-page__agent-head {
  justify-content: space-between;
  align-items: flex-start;
}

.agents-page__agent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.agents-page__meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-secondary);
  font-size: 12px;
}

.agents-page__agent-scope {
  color: var(--text-tertiary);
}

.agents-page__agent-actions {
  justify-content: flex-end;
  margin-top: auto;
}

.agents-page__system-list {
  grid-template-columns: 1fr;
}

.agents-page__system-card {
  padding: 18px;
}

.agents-page__system-top {
  justify-content: space-between;
  margin-bottom: 10px;
}

@media (max-width: 1280px) {
  .agents-page__stats,
  .agents-page__loading {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agents-page__grid,
  .agents-page__bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .agents-page__hero,
  .agents-page__hero-actions,
  .agents-page__panel-head,
  .agents-page__agent-head,
  .agents-page__agent-actions,
  .agents-page__system-top {
    align-items: flex-start;
    flex-direction: column;
  }

  .agents-page__stats,
  .agents-page__loading {
    grid-template-columns: 1fr;
  }

  .agents-page__hero,
  .agents-page__stat-card,
  .agents-page__panel {
    padding: 18px;
  }

  .agents-page__chart--flow {
    height: 320px;
  }
}
</style>
