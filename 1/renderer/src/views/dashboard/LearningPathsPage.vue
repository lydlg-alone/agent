<template>
  <div>
    <div class="page-header">
      <div>
        <h1>学习路径</h1>
        <p>AI 根据你的目标和水平生成个性化学习计划</p>
      </div>
      <div style="display:flex;gap:10px">
        <el-button @click="loadPlans">刷新</el-button>
        <el-button type="primary" @click="openCreateDialog">生成学习路径</el-button>
      </div>
    </div>

    <div v-if="loading" style="text-align:center;padding:36px;color:var(--text-tertiary)">加载中…</div>
    <div v-else-if="!plans.length" class="surface-card" style="text-align:center;padding:36px;color:var(--text-tertiary)">
      暂无学习路径，点击「生成学习路径」由 AI 为你定制
    </div>

    <div v-else class="card-grid">
      <div v-for="plan in plans" :key="plan.id" class="surface-card" style="cursor:pointer" @click="$router.push({name:'learning-path-detail',params:{id:plan.id}})">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <h4 style="margin:0;font-size:15px">{{ plan.goal }}</h4>
          <el-tag size="small" :type="plan.difficulty==='beginner'?'success':plan.difficulty==='advanced'?'danger':'warning'">{{ plan.difficulty }}</el-tag>
        </div>
        <p style="margin:0 0 12px;font-size:13px;color:var(--text-tertiary)">{{ stageCount(plan) }} 个阶段 · {{ formatDate(plan.created_at) }}</p>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="flex:1;height:6px;border-radius:3px;background:var(--border-light);overflow:hidden">
            <div style="height:100%;border-radius:3px;background:var(--brand-blue);transition:width 0.3s" :style="{width:progressPercent(plan)+'%'}"></div>
          </div>
          <span style="font-size:12px;color:var(--text-secondary);white-space:nowrap">{{ completedCount(plan) }}/{{ stageCount(plan) }}</span>
        </div>
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <el-button text size="small">查看</el-button>
          <el-button text size="small" type="danger" @click.stop="removePlan(plan.id)">删除</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialog.visible" title="AI 生成学习路径" width="500px">
      <el-form label-position="top">
        <el-form-item label="学习目标"><el-input v-model="dialog.form.goal" maxlength="200" /></el-form-item>
        <el-form-item label="难度">
          <el-select v-model="dialog.form.difficulty">
            <el-option label="入门" value="beginner" /><el-option label="进阶" value="intermediate" /><el-option label="高阶" value="advanced" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="dialog.generating" @click="submitDialog">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/services/api.js";

const router = useRouter();
const plans = ref([]);
const loading = ref(false);
const dialog = reactive({ visible:false, generating:false, form:{ goal:"", difficulty:"intermediate" } });

async function loadPlans() {
  loading.value = true;
  try { const { data } = await api.get("/learning-plans"); plans.value = Array.isArray(data)?data:[]; } finally { loading.value = false; }
}

function openCreateDialog() { dialog.visible = true; dialog.form = { goal:"", difficulty:"intermediate" }; }

async function submitDialog() {
  if (!dialog.form.goal.trim()) { ElMessage.warning("请输入学习目标"); return; }
  dialog.generating = true;
  try { await api.post("/workflows/plan", { goal:dialog.form.goal.trim(), difficulty:dialog.form.difficulty }); dialog.visible = false; ElMessage.success("已生成"); await loadPlans(); }
  catch (err) { ElMessage.error(err?.response?.data?.message||"生成失败"); } finally { dialog.generating = false; }
}

async function removePlan(id) {
  try { await ElMessageBox.confirm("确认删除？","删除确认",{type:"warning"}); await api.delete(`/learning-plans/${id}`); ElMessage.success("已删除"); await loadPlans(); }
  catch (err) { if (err!=="cancel") ElMessage.error("删除失败"); }
}

function stageCount(p) { try { return JSON.parse(p.stages_json||"[]").length; } catch { return 0; } }
function completedCount(p) { try { return JSON.parse(p.stages_json||"[]").filter(s=>s.completed).length; } catch { return 0; } }
function progressPercent(p) { const t=stageCount(p); return t?Math.round(completedCount(p)/t*100):0; }
function formatDate(v) { if(!v) return "-"; const d=new Date(v); return Number.isNaN(d.getTime())?v:d.toLocaleDateString(); }

onMounted(loadPlans);
</script>

<style scoped>
</style>
