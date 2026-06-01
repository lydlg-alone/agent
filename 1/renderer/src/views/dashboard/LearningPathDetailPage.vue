<template>
  <div>
    <div class="page-header">
      <div>
        <el-button text @click="$router.push({name:'learning-paths'})">← 返回列表</el-button>
        <h1 style="margin-top:6px">{{ plan?.goal || '学习路径详情' }}</h1>
        <p>{{ plan?.difficulty || '' }} · {{ stageCount }} 个阶段</p>
      </div>
      <div style="min-width:200px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <span style="font-size:13px;color:var(--text-secondary)">{{ completedCount }}/{{ stageCount }} 已完成</span>
        </div>
        <div style="height:8px;border-radius:4px;background:var(--border-light);overflow:hidden">
          <div style="height:100%;border-radius:4px;background:var(--brand-blue);transition:width 0.3s" :style="{width:progressPercent+'%'}"></div>
        </div>
      </div>
    </div>

    <div v-if="loading" style="text-align:center;padding:36px;color:var(--text-tertiary)">加载中…</div>
    <div v-else-if="!stages.length" class="surface-card" style="text-align:center;padding:36px;color:var(--text-tertiary)">暂无阶段内容</div>

    <div v-else style="display:flex;flex-direction:column;gap:12px">
      <div v-for="(stage,i) in stages" :key="i" class="surface-card"
        style="display:flex;align-items:flex-start;gap:16px"
        :style="{ opacity: stage.completed ? 0.65 : 1, borderColor: stage.completed ? 'var(--color-success)' : '' }">
        <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700"
          :style="{ background: stage.completed ? 'var(--color-success)' : 'var(--bg-surface-alt)', color: stage.completed ? '#fff' : 'var(--text-secondary)' }">
          {{ stage.completed ? '✓' : i+1 }}
        </div>
        <div style="flex:1;min-width:0">
          <h4 style="margin:0 0 4px;font-size:15px">{{ stage.title || `阶段 ${i+1}` }}</h4>
          <p style="margin:0 0 6px;font-size:13px;color:var(--text-secondary);line-height:1.5">{{ stage.description || '暂无描述' }}</p>
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-tertiary)">
            <el-tag v-if="stage.type" size="small">{{ stage.type }}</el-tag>
            <span v-if="stage.duration">{{ stage.duration }} 分钟</span>
          </div>
        </div>
        <el-button size="small" :type="stage.completed?'default':'primary'" :disabled="stage.completed" @click="toggleStage(i)" style="flex-shrink:0">
          {{ stage.completed ? '已完成' : '标记完成' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { api } from "@/services/api.js";

const route = useRoute();
const planId = computed(() => String(route.params.id||""));
const plan = ref(null);
const stages = ref([]);
const loading = ref(false);

const stageCount = computed(() => stages.value.length);
const completedCount = computed(() => stages.value.filter(s=>s.completed).length);
const progressPercent = computed(() => stageCount.value?Math.round(completedCount.value/stageCount.value*100):0);

async function loadPlan() {
  loading.value = true;
  try {
    const { data } = await api.get(`/learning-plans/${planId.value}`);
    plan.value = data;
    try { stages.value = JSON.parse(data.stages_json||"[]"); } catch { stages.value = []; }
  } finally { loading.value = false; }
}

async function toggleStage(i) {
  const updated = [...stages.value]; updated[i] = {...updated[i], completed:true}; stages.value = updated;
  try { await api.patch(`/learning-plans/${planId.value}`, {stages_json:JSON.stringify(updated)}); }
  catch (err) { updated[i] = {...updated[i], completed:false}; stages.value = updated; ElMessage.error("更新失败"); }
}

onMounted(loadPlan);
</script>

<style scoped>
</style>
