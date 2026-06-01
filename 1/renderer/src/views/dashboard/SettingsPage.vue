<template>
  <section class="settings-page">
    <header class="settings-page__hero surface-card">
      <div class="settings-page__hero-main">
        <span class="settings-page__eyebrow">Model Control</span>
        <h1>模型配置</h1>
        <p>统一管理当前学习空间使用的模型、API 接入、提示词和配置文件，不再保留页面内的 Agent 管理入口。</p>
      </div>

      <div class="settings-page__hero-stats">
        <div class="settings-page__stat">
          <span>当前 Provider</span>
          <strong>{{ runtimeProviderLabel }}</strong>
        </div>
        <div class="settings-page__stat">
          <span>当前模型</span>
          <strong>{{ runtimeModelLabel }}</strong>
        </div>
        <div class="settings-page__stat">
          <span>运行状态</span>
          <strong>{{ runtimeConfigured ? "已接入" : "本地演示" }}</strong>
        </div>
      </div>
    </header>

    <div class="settings-page__layout">
      <aside class="settings-page__sidebar">
        <section class="surface-card settings-page__panel">
          <div class="settings-page__panel-head">
            <h2>账户资料</h2>
            <span>次要信息</span>
          </div>

          <el-form label-position="top">
            <el-form-item label="用户名">
              <el-input v-model="profileForm.name" maxlength="60" />
            </el-form-item>
            <el-form-item label="学习目标">
              <el-input v-model="profileForm.currentGoal" maxlength="200" />
            </el-form-item>
            <el-form-item label="当前水平">
              <el-select v-model="profileForm.level">
                <el-option label="入门" value="beginner" />
                <el-option label="进阶" value="intermediate" />
                <el-option label="高级" value="advanced" />
              </el-select>
            </el-form-item>
            <el-form-item label="学习偏好">
              <el-select v-model="profileForm.preference">
                <el-option label="闪卡记忆" value="flashcards" />
                <el-option label="测验练习" value="quizzes" />
                <el-option label="AI 对话" value="chat" />
                <el-option label="混合模式" value="mixed" />
              </el-select>
            </el-form-item>
          </el-form>

          <div class="settings-page__panel-actions">
            <el-button type="primary" :loading="savingProfile" @click="saveProfile">保存资料</el-button>
          </div>
        </section>

        <section class="surface-card settings-page__panel">
          <div class="settings-page__panel-head">
            <h2>当前状态</h2>
            <span>配置摘要</span>
          </div>

          <dl class="settings-page__meta-list">
            <div>
              <dt>连接状态</dt>
              <dd>{{ settingsRuntimeStatusText }}</dd>
            </div>
            <div>
              <dt>模型提示</dt>
              <dd>{{ settingsModelHelpText }}</dd>
            </div>
            <div>
              <dt>配置文件</dt>
              <dd>{{ settingsStorageText }}</dd>
            </div>
          </dl>
        </section>

        <section class="surface-card settings-page__panel settings-page__panel--danger">
          <div class="settings-page__panel-head">
            <h2>退出登录</h2>
            <span>危险操作</span>
          </div>
          <p class="settings-page__danger-text">退出后需要重新登录，当前本地用户信息会被清除。</p>
          <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
        </section>
      </aside>

      <div class="settings-page__main">
        <SettingsFormEmbed
          :settings="settingsDraft"
          :loading-save="loadingSettingsSave"
          :loading-test="loadingSettingsTest"
          :runtime-status-text="settingsRuntimeStatusText"
          :model-help-text="settingsModelHelpText"
          :storage-text="settingsStorageText"
          :templates="providerTemplates"
          :recent-models="recentSuccessfulModels"
          :connection-history="connectionHistory"
          :available-models="availableRemoteModels"
          @detect="handleDetectModel"
          @save="handleSaveSettings"
          @test="handleTestConnection"
          @apply-template="handleApplyTemplate"
          @select-recent-model="handleSelectRecentModel"
          @select-available-model="handleSelectAvailableModel"
          @export-config="handleExportConfig"
          @import-config="handleImportConfig"
          @clear-history="handleClearHistory"
        />
      </div>
    </div>

    <input
      ref="configImportInputRef"
      type="file"
      accept=".json"
      class="settings-page__hidden-input"
      @change="handleConfigFileChange"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import SettingsFormEmbed from "@/components/workspace/SettingsForm.vue";
import { createEmptyRuntimeDraft, useRuntimeStore } from "@/stores/runtime.js";
import { useUserStore } from "@/stores/user.js";
import {
  clearConnectionHistory,
  detectCurrentModel,
  exportModelConfig,
  fetchConnectionHistory,
  fetchProviderTemplates,
  fetchRecentSuccessfulModels,
  fetchRuntimeSettings,
  importModelConfig,
  saveRuntimeSettings,
  testRuntimeSettings
} from "@/services/api.js";

const router = useRouter();
const userStore = useUserStore();
const runtimeStore = useRuntimeStore();
const { settingsModelHelpText, settingsRuntimeStatusText, settingsStorageText } = storeToRefs(runtimeStore);

const savingProfile = ref(false);
const loadingSettingsSave = ref(false);
const loadingSettingsTest = ref(false);
const configImportInputRef = ref(null);

const profileForm = reactive({
  name: "",
  currentGoal: "",
  level: "",
  preference: ""
});

const settingsDraft = reactive(createEmptyRuntimeDraft());
const providerTemplates = ref([]);
const recentSuccessfulModels = ref([]);
const connectionHistory = ref([]);
const availableRemoteModels = ref([]);

const runtimeProviderLabel = computed(() => runtimeStore.provider || runtimeStore.currentModel?.provider || "未识别");
const runtimeModelLabel = computed(() => runtimeStore.modelId || runtimeStore.currentModel?.modelId || "自动识别");
const runtimeConfigured = computed(() => runtimeStore.apiConfigured);

function syncProfileForm() {
  const user = userStore.currentUser;
  profileForm.name = user?.name || "";
  profileForm.currentGoal = user?.current_goal || "";
  profileForm.level = user?.level || "";
  profileForm.preference = user?.preference || "";
}

function syncSettingsDraft() {
  Object.assign(settingsDraft, runtimeStore.createDraft());
}

async function refreshRuntimeSettings() {
  const payload = await fetchRuntimeSettings();
  runtimeStore.applyPayload(payload);
  syncSettingsDraft();
  return payload;
}

async function loadSettingsPageData() {
  try {
    const [templates, history, recent] = await Promise.all([
      fetchProviderTemplates(),
      fetchConnectionHistory(),
      fetchRecentSuccessfulModels()
    ]);
    providerTemplates.value = templates;
    connectionHistory.value = history;
    recentSuccessfulModels.value = recent;
  } catch {
    // Non-critical; the configuration form can still work.
  }
}

async function refreshConnectionData() {
  try {
    const [history, recent] = await Promise.all([
      fetchConnectionHistory(),
      fetchRecentSuccessfulModels()
    ]);
    connectionHistory.value = history;
    recentSuccessfulModels.value = recent;
  } catch {
    // Non-critical.
  }
}

async function saveProfile() {
  if (!profileForm.name.trim()) {
    ElMessage.warning("用户名不能为空");
    return;
  }

  savingProfile.value = true;
  try {
    await userStore.updateProfile({
      name: profileForm.name.trim(),
      current_goal: profileForm.currentGoal.trim() || undefined,
      level: profileForm.level || undefined,
      preference: profileForm.preference || undefined
    });
    ElMessage.success("资料已保存");
  } catch (error) {
    ElMessage.error(error?.message || "保存资料失败");
  } finally {
    savingProfile.value = false;
  }
}

async function handleDetectModel(payload) {
  try {
    const data = await detectCurrentModel({
      baseUrl: payload.baseUrl,
      apiKey: payload.apiKey,
      provider: payload.provider,
      modelId: payload.modelId
    });

    settingsDraft.provider = data.provider || payload.provider;
    settingsDraft.modelId = data.model || payload.modelId;
    availableRemoteModels.value = data.availableModels || [];
    await refreshConnectionData();
    ElMessage.success(data.message || "已识别当前模型");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "识别模型失败"));
  }
}

async function handleSaveSettings(payload) {
  loadingSettingsSave.value = true;
  try {
    const data = await saveRuntimeSettings({
      provider: payload.provider,
      baseUrl: payload.baseUrl,
      apiKey: payload.apiKey,
      systemPrompt: payload.systemPrompt,
      modelId: payload.modelId
    });

    runtimeStore.applyPayload(data);
    syncSettingsDraft();
    await refreshConnectionData();
    ElMessage.success(data.message || "配置已保存");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "保存配置失败"));
  } finally {
    loadingSettingsSave.value = false;
  }
}

async function handleTestConnection(payload) {
  loadingSettingsTest.value = true;
  try {
    const data = await testRuntimeSettings({
      provider: payload.provider,
      baseUrl: payload.baseUrl,
      apiKey: payload.apiKey || "",
      modelId: payload.modelId
    });

    availableRemoteModels.value = data.availableModels || [];
    await refreshConnectionData();
    ElMessage[data.success ? "success" : "warning"](data.message || "测试完成");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "测试连接失败"));
  } finally {
    loadingSettingsTest.value = false;
  }
}

function handleApplyTemplate(template) {
  settingsDraft.baseUrl = template.baseUrl;
  settingsDraft.modelId = template.defaultModel;
  settingsDraft.provider = template.id !== "custom" ? template.name : settingsDraft.provider;
}

function handleSelectRecentModel(item) {
  settingsDraft.provider = item.provider || settingsDraft.provider;
  settingsDraft.baseUrl = item.baseUrl || settingsDraft.baseUrl;
  settingsDraft.modelId = item.modelId || settingsDraft.modelId;
  ElMessage.success(`已切换至 ${item.provider} · ${item.modelId}`);
}

function handleSelectAvailableModel() {
  ElMessage.success(`已选择模型：${settingsDraft.modelId}`);
}

async function handleExportConfig() {
  try {
    const config = await exportModelConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `agent-config-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    ElMessage.success("配置已导出");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "导出配置失败"));
  }
}

function handleImportConfig() {
  configImportInputRef.value?.click();
}

async function handleConfigFileChange(event) {
  const files = event.target.files;
  event.target.value = "";
  if (!files?.length) {
    return;
  }

  try {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(files[0]);
    });

    const config = JSON.parse(text);
    const result = await importModelConfig(config);
    runtimeStore.applyPayload(result);
    syncSettingsDraft();
    await refreshConnectionData();
    ElMessage.success(result.message || "配置已导入");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "导入配置失败，请检查文件格式"));
  }
}

async function handleClearHistory() {
  try {
    await clearConnectionHistory();
    connectionHistory.value = [];
    ElMessage.success("连接历史已清空");
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "清空历史失败"));
  }
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm("确认退出登录？", "退出确认", { type: "warning" });
    userStore.logout();
    router.replace({ name: "login" });
  } catch {
    // cancelled
  }
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

onMounted(async () => {
  syncProfileForm();
  await Promise.all([refreshRuntimeSettings(), loadSettingsPageData()]);
});
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.surface-card {
  border-radius: 28px;
  border: 1px solid var(--border-light);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(235, 248, 255, 0.8)),
    var(--bg-overlay-strong);
  box-shadow: var(--shadow-card);
}

.settings-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 30px;
}

.settings-page__hero-main {
  max-width: 760px;
}

.settings-page__eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  color: var(--brand-blue);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.settings-page__hero h1,
.settings-page__panel-head h2 {
  margin: 0;
}

.settings-page__hero p,
.settings-page__danger-text {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.75;
}

.settings-page__hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
  gap: 14px;
  min-width: min(100%, 460px);
}

.settings-page__stat {
  padding: 18px 16px;
  border-radius: 20px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.74);
}

.settings-page__stat span {
  display: block;
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-page__stat strong {
  display: block;
  margin-top: 8px;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.5;
  word-break: break-word;
}

.settings-page__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.settings-page__sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.settings-page__panel {
  padding: 22px;
}

.settings-page__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.settings-page__panel-head span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.settings-page__panel-actions {
  margin-top: 8px;
}

.settings-page__meta-list {
  display: grid;
  gap: 14px;
  margin: 0;
}

.settings-page__meta-list dt {
  margin-bottom: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-page__meta-list dd {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.7;
  word-break: break-word;
}

.settings-page__panel--danger {
  border-color: rgba(224, 82, 104, 0.22);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 240, 243, 0.74)),
    var(--bg-overlay-strong);
}

.settings-page__main {
  min-width: 0;
}

.settings-page__hidden-input {
  display: none;
}

@media (max-width: 1320px) {
  .settings-page__hero {
    flex-direction: column;
  }

  .settings-page__hero-stats {
    min-width: 0;
    width: 100%;
  }
}

@media (max-width: 1080px) {
  .settings-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .settings-page__hero,
  .settings-page__panel {
    padding: 20px;
  }

  .settings-page__hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
