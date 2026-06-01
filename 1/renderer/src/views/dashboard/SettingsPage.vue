<template>
  <div>
    <div class="page-header">
      <div>
        <h1>设置</h1>
        <p>管理你的账户信息、模型配置和智能体</p>
      </div>
    </div>

    <div class="surface-card" style="margin-bottom:20px">
      <h3 style="margin:0 0 18px;font-size:15px;font-weight:700">个人资料</h3>
      <el-form label-position="top" style="max-width:480px">
        <el-form-item label="用户名称">
          <el-input v-model="form.name" maxlength="60" />
        </el-form-item>
        <el-form-item label="学习目标">
          <el-input v-model="form.currentGoal" maxlength="200" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="当前水平">
              <el-select v-model="form.level">
                <el-option label="入门" value="beginner" />
                <el-option label="进阶" value="intermediate" />
                <el-option label="高阶" value="advanced" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学习偏好">
              <el-select v-model="form.preference">
                <el-option label="闪卡记忆" value="flashcards" />
                <el-option label="测验练习" value="quizzes" />
                <el-option label="AI 对话" value="chat" />
                <el-option label="混合模式" value="mixed" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存更改</el-button>
      </el-form>
    </div>

    <div class="surface-card" style="margin-bottom:20px">
      <h3 style="margin:0 0 14px;font-size:15px;font-weight:700">系统配置</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="settings-link" @click="showModelConfig = true">
          <div>
            <span style="font-size:15px;font-weight:600">🤖 模型配置</span>
            <span style="display:block;font-size:13px;color:var(--text-tertiary);margin-top:2px">管理 AI 模型连接与运行时参数</span>
          </div>
          <span style="color:var(--text-tertiary)">→</span>
        </button>
        <RouterLink to="/dashboard/settings/agents" class="settings-link">
          <div>
            <span style="font-size:15px;font-weight:600">🧠 Agent 管理</span>
            <span style="display:block;font-size:13px;color:var(--text-tertiary);margin-top:2px">配置智能体角色与知识范围</span>
          </div>
          <span style="color:var(--text-tertiary)">→</span>
        </RouterLink>
      </div>
    </div>

    <div class="surface-card" style="border-color:rgba(224,82,104,0.3);background:rgba(224,82,104,0.03)">
      <h3 style="margin:0 0 8px;font-size:15px;font-weight:700">危险操作</h3>
      <p style="margin:0 0 12px;font-size:13px;color:var(--text-tertiary)">退出后需要重新登录</p>
      <el-button type="danger" text @click="handleLogout">退出登录</el-button>
    </div>

    <!-- Model Config Dialog -->
    <el-dialog v-model="showModelConfig" title="API 接入配置" width="720px" destroy-on-close>
      <SettingsFormEmbed />
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/stores/user.js";
import SettingsFormEmbed from "@/components/workspace/SettingsForm.vue";

const router = useRouter();
const userStore = useUserStore();
const saving = ref(false);
const showModelConfig = ref(false);
const form = reactive({ name:"", currentGoal:"", level:"", preference:"" });

onMounted(() => {
  const u = userStore.currentUser;
  if (u) { form.name = u.name||""; form.currentGoal = u.current_goal||""; form.level = u.level||""; form.preference = u.preference||""; }
});

async function saveProfile() {
  if (!form.name.trim()) { ElMessage.warning("名称不能为空"); return; }
  saving.value = true;
  try {
    await userStore.updateProfile({ name:form.name.trim(), current_goal:form.currentGoal.trim()||undefined, level:form.level||undefined, preference:form.preference||undefined });
    ElMessage.success("已更新");
  } catch (err) { ElMessage.error(err?.message||"保存失败"); } finally { saving.value = false; }
}

async function handleLogout() {
  try { await ElMessageBox.confirm("确认退出？","退出确认",{type:"warning"}); userStore.logout(); router.replace({name:"home"}); } catch {}
}
</script>

<style scoped>
.settings-link {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-radius:12px; background:var(--bg-surface);
  border:1px solid var(--border-subtle); text-decoration:none; color:inherit;
  transition: border-color 0.15s, background 0.15s;
}
.settings-link:hover { border-color:var(--brand-blue-border); background:var(--bg-surface-hover); }
</style>
