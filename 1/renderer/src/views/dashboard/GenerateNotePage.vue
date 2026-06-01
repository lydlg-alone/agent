<template>
  <section class="note-generate-page">
    <header class="note-generate-page__hero surface-card">
      <div>
        <button type="button" class="note-generate-page__back" @click="goBack">返回笔记中心</button>
        <h2>AI 生成笔记</h2>
        <p>借鉴 `studyield-main` 的多步骤生成体验，但仍基于当前后端的学习集上下文生成能力。</p>
      </div>
      <div class="note-generate-page__hero-actions">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" :disabled="step === 'processing'" :loading="step === 'processing'" @click="handlePrimaryAction">
          {{ primaryActionLabel }}
        </el-button>
      </div>
    </header>

    <section v-if="step === 'select' || step === 'form'" class="note-generate-page__workspace">
      <div class="surface-card note-generate-page__main">
        <div class="note-generate-page__section-head">
          <h3>选择来源类型</h3>
          <span>第 1 步 / 2 步</span>
        </div>

        <div class="note-generate-page__source-grid">
          <button
            v-for="item in sourceOptions"
            :key="item.value"
            type="button"
            class="note-generate-page__source-card"
            :class="{ 'note-generate-page__source-card--active': form.sourceType === item.value }"
            @click="form.sourceType = item.value"
          >
            <strong>{{ item.label }}</strong>
            <p>{{ item.description }}</p>
          </button>
        </div>

        <div class="note-generate-page__form">
          <div class="note-generate-page__section-head">
            <h3>补充生成信息</h3>
            <span>第 2 步 / 2 步</span>
          </div>

          <el-form label-position="top">
            <el-form-item label="学习集">
              <el-select v-model="form.studySetId" placeholder="请选择学习集">
                <el-option
                  v-for="studySet in studySets"
                  :key="studySet.id"
                  :label="studySet.title"
                  :value="studySet.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="聚焦主题（可选）">
              <el-input
                v-model="form.topic"
                maxlength="200"
                placeholder="例如：极限定义、TCP 三次握手、数据库事务隔离级别"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <aside class="note-generate-page__sidebar">
        <section class="surface-card note-generate-page__panel">
          <h3>生成预期</h3>
          <ul class="note-generate-page__checklist">
            <li>从学习集标题、描述和闪卡中自动整理上下文。</li>
            <li>生成结构化标题、正文和来源类型标记。</li>
            <li>完成后可直接进入详情页切换为思维导图或演示视图。</li>
          </ul>
        </section>

        <section class="surface-card note-generate-page__panel">
          <div class="note-generate-page__panel-head">
            <h3>当前配置</h3>
            <span>{{ selectedSource.label }}</span>
          </div>
          <dl class="note-generate-page__summary">
            <div>
              <dt>学习集</dt>
              <dd>{{ selectedStudySetTitle }}</dd>
            </div>
            <div>
              <dt>主题</dt>
              <dd>{{ form.topic.trim() || "自动摘要整个学习集" }}</dd>
            </div>
            <div>
              <dt>来源类型</dt>
              <dd>{{ selectedSource.description }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </section>

    <section v-else-if="step === 'processing'" class="surface-card note-generate-page__processing">
      <div class="note-generate-page__processing-orb"></div>
      <h3>AI 正在生成笔记</h3>
      <p>基于你选定的学习集和主题，系统会先整理上下文，再创建结构化笔记。</p>
      <div class="note-generate-page__timeline">
        <div
          v-for="(item, index) in processingSteps"
          :key="item"
          class="note-generate-page__timeline-item"
          :class="{
            'note-generate-page__timeline-item--done': index < processingIndex,
            'note-generate-page__timeline-item--active': index === processingIndex
          }"
        >
          <span>{{ index + 1 }}</span>
          <strong>{{ item }}</strong>
        </div>
      </div>
    </section>

    <section v-else-if="createdNote" class="note-generate-page__workspace">
      <div class="surface-card note-generate-page__main">
        <div class="note-generate-page__success-banner">
          <strong>生成完成</strong>
          <p>笔记已经创建成功，你可以直接查看详情，或调整配置继续生成下一条。</p>
        </div>

        <div class="note-generate-page__preview-card">
          <div class="note-generate-page__panel-head">
            <h3>{{ createdNote.title }}</h3>
            <span>{{ createdNote.studySetTitle || selectedStudySetTitle }}</span>
          </div>
          <p class="note-generate-page__preview-excerpt">{{ excerpt(createdNote.content) }}</p>
          <div class="note-generate-page__preview-tags">
            <el-tag size="small" effect="plain">{{ selectedSource.label }}</el-tag>
            <el-tag v-if="createdNote.isPinned" size="small" type="warning">置顶</el-tag>
            <el-tag size="small" effect="plain">{{ createdNote.colorToken || "sky" }}</el-tag>
          </div>
        </div>

        <div class="note-generate-page__success-actions">
          <el-button @click="resetFlow">再生成一条</el-button>
          <el-button type="primary" @click="openCreatedNote">打开详情页</el-button>
        </div>
      </div>

      <aside class="note-generate-page__sidebar">
        <section class="surface-card note-generate-page__panel">
          <h3>本次生成摘要</h3>
          <dl class="note-generate-page__summary">
            <div>
              <dt>学习集</dt>
              <dd>{{ selectedStudySetTitle }}</dd>
            </div>
            <div>
              <dt>主题</dt>
              <dd>{{ form.topic.trim() || "自动摘要整个学习集" }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ formatDateTime(createdNote.updatedAt) }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { useNotesStore } from "@/stores/notes.js";
import { useStudySetsStore } from "@/stores/studySets.js";

const route = useRoute();
const router = useRouter();
const notesStore = useNotesStore();
const studySetsStore = useStudySetsStore();
const { items: studySets } = storeToRefs(studySetsStore);

const form = reactive({
  studySetId: "",
  topic: "",
  sourceType: "summary"
});

const step = ref("select");
const processingIndex = ref(0);
const createdNote = ref(null);
let processingTimer = null;

const sourceOptions = [
  { label: "摘要", value: "summary", description: "适合直接提炼整个学习集的重点脉络。" },
  { label: "PDF", value: "pdf", description: "强调来自 PDF 资料的概念和知识点。" },
  { label: "网站", value: "website", description: "更适合网页文章、在线文档类内容。" },
  { label: "YouTube", value: "youtube", description: "用于视频课程、讲解记录的笔记整理。" },
  { label: "音频", value: "audio", description: "偏向讲座、访谈、录音转写内容。" },
  { label: "手写", value: "handwriting", description: "模拟从纸质笔记或白板内容整理要点。" }
];

const processingSteps = ["提取学习集上下文", "组织知识结构", "生成正文草稿", "写入笔记记录"];
const selectedSource = computed(() => sourceOptions.find((item) => item.value === form.sourceType) || sourceOptions[0]);
const selectedStudySetTitle = computed(() => {
  const matched = studySets.value.find((item) => item.id === form.studySetId);
  return matched?.title || "尚未选择";
});

const primaryActionLabel = computed(() => {
  if (step.value === "processing") {
    return "生成中";
  }
  if (step.value === "success") {
    return "打开详情页";
  }
  return "开始生成";
});

function goBack() {
  router.push({ name: "notes" });
}

function clearProcessingTimer() {
  if (processingTimer) {
    clearInterval(processingTimer);
    processingTimer = null;
  }
}

function excerpt(content) {
  const plain = String(content || "").replace(/\s+/g, " ").trim();
  return plain.length > 240 ? `${plain.slice(0, 240)}...` : plain;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function resetFlow() {
  createdNote.value = null;
  step.value = "select";
  processingIndex.value = 0;
  form.topic = "";
}

function openCreatedNote() {
  if (!createdNote.value?.id) {
    return;
  }
  router.push({ name: "note-detail", params: { noteId: createdNote.value.id } });
}

function handlePrimaryAction() {
  if (step.value === "success") {
    openCreatedNote();
    return;
  }
  submit();
}

async function submit() {
  if (!form.studySetId) {
    ElMessage.warning("请选择学习集");
    return;
  }

  step.value = "processing";
  processingIndex.value = 0;
  clearProcessingTimer();
  processingTimer = setInterval(() => {
    if (processingIndex.value < processingSteps.length - 1) {
      processingIndex.value += 1;
    }
  }, 650);

  try {
    const note = await notesStore.generateNote({
      studySetId: form.studySetId,
      topic: form.topic.trim(),
      sourceType: form.sourceType
    });
    clearProcessingTimer();
    processingIndex.value = processingSteps.length - 1;
    createdNote.value = note;
    step.value = "success";
    ElMessage.success("笔记已生成");
  } catch (error) {
    clearProcessingTimer();
    step.value = "form";
    ElMessage.error(error?.response?.data?.message || error?.message || "生成笔记失败");
  }
}

onMounted(async () => {
  if (!studySets.value.length) {
    await studySetsStore.fetchStudySets();
  }
  form.studySetId = String(route.params.id || route.query.studySetId || studySets.value[0]?.id || "");
  step.value = "form";
});

onBeforeUnmount(() => {
  clearProcessingTimer();
});
</script>

<style scoped>
.note-generate-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.surface-card,
.note-generate-page__source-card,
.note-generate-page__timeline-item {
  border-radius: 28px;
  border: 1px solid var(--border-light);
  background: var(--bg-overlay-strong);
  box-shadow: var(--shadow-card);
}

.note-generate-page__hero,
.note-generate-page__hero-actions,
.note-generate-page__section-head,
.note-generate-page__panel-head,
.note-generate-page__success-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-generate-page__hero {
  justify-content: space-between;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(236, 248, 255, 0.88));
}

.note-generate-page__hero h2,
.note-generate-page__section-head h3,
.note-generate-page__panel h3 {
  margin: 0;
}

.note-generate-page__hero p {
  max-width: 760px;
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.note-generate-page__back {
  margin-bottom: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--brand-blue);
  font: inherit;
  cursor: pointer;
}

.note-generate-page__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
  gap: 20px;
}

.note-generate-page__main,
.note-generate-page__panel,
.note-generate-page__processing {
  padding: 22px;
}

.note-generate-page__sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.note-generate-page__section-head,
.note-generate-page__panel-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.note-generate-page__section-head span,
.note-generate-page__panel-head span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.note-generate-page__source-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.note-generate-page__source-card {
  padding: 18px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.note-generate-page__source-card strong,
.note-generate-page__timeline-item strong {
  display: block;
}

.note-generate-page__source-card p,
.note-generate-page__processing p,
.note-generate-page__success-banner p,
.note-generate-page__preview-excerpt {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.note-generate-page__source-card:hover,
.note-generate-page__source-card--active {
  transform: translateY(-2px);
  border-color: var(--brand-blue-border);
  box-shadow: var(--shadow-elevated);
}

.note-generate-page__source-card--active {
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 28%),
    rgba(255, 255, 255, 0.92);
}

.note-generate-page__form {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--border-light);
}

.note-generate-page__checklist {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.note-generate-page__checklist li + li {
  margin-top: 8px;
}

.note-generate-page__summary {
  display: grid;
  gap: 14px;
  margin: 0;
}

.note-generate-page__summary dt {
  margin-bottom: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.note-generate-page__summary dd {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.6;
}

.note-generate-page__processing {
  text-align: center;
}

.note-generate-page__processing-orb {
  width: 80px;
  height: 80px;
  margin: 8px auto 18px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), transparent 20%),
    linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(37, 99, 235, 0.88));
  box-shadow: 0 0 0 10px rgba(14, 165, 233, 0.08);
  animation: pulse 1.8s ease-in-out infinite;
}

.note-generate-page__timeline {
  display: grid;
  gap: 12px;
  max-width: 560px;
  margin: 22px auto 0;
}

.note-generate-page__timeline-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
}

.note-generate-page__timeline-item span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.16);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.note-generate-page__timeline-item--active {
  border-color: var(--brand-blue-border);
}

.note-generate-page__timeline-item--active span,
.note-generate-page__timeline-item--done span {
  color: #fff;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
}

.note-generate-page__success-banner,
.note-generate-page__preview-card {
  padding: 20px;
  border-radius: 24px;
  border: 1px solid var(--border-light);
}

.note-generate-page__success-banner {
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.18), transparent 28%),
    rgba(240, 253, 250, 0.88);
}

.note-generate-page__preview-card {
  margin-top: 18px;
  background: rgba(248, 252, 255, 0.94);
}

.note-generate-page__preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.note-generate-page__success-actions {
  justify-content: flex-end;
  margin-top: 18px;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.06);
  }
}

@media (max-width: 1080px) {
  .note-generate-page__workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .note-generate-page__hero,
  .note-generate-page__hero-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .note-generate-page__source-grid {
    grid-template-columns: 1fr;
  }

  .note-generate-page__success-actions {
    justify-content: stretch;
    flex-direction: column;
  }
}
</style>
