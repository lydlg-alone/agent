<template>
  <section class="study-set-detail">
    <header class="study-set-detail__header">
      <div>
        <h2>{{ studySet?.title || "学习集详情" }}</h2>
        <p>{{ studySet?.description || "在这里管理学习集的闪卡、测验、笔记、文档和来源。" }}</p>
      </div>

      <div class="study-set-detail__actions">
        <el-button @click="goBack">返回列表</el-button>
        <el-button @click="openChatWithContext">带上下文聊天</el-button>
      </div>
    </header>

    <section class="study-set-detail__summary">
      <article class="study-set-detail__summary-card">
        <strong>{{ flashcards.length }}</strong>
        <span>闪卡</span>
      </article>
      <article class="study-set-detail__summary-card">
        <strong>{{ quizzes.length }}</strong>
        <span>测验</span>
      </article>
      <article class="study-set-detail__summary-card">
        <strong>{{ notes.length }}</strong>
        <span>笔记</span>
      </article>
      <article class="study-set-detail__summary-card">
        <strong>{{ documents.length }}</strong>
        <span>文档</span>
      </article>
    </section>

    <div class="study-set-detail__nav">
      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        class="study-set-detail__nav-item"
        :class="{ 'study-set-detail__nav-item--active': activeTab === item.key }"
        @click="activeTab = item.key"
      >
        <strong>{{ item.label }}</strong>
        <span>{{ item.count }}</span>
      </button>
    </div>

    <section v-if="activeTab === 'flashcards'" class="study-set-detail__panel">
      <div class="study-set-detail__panel-head">
        <div>
          <h3>闪卡</h3>
          <p>查看当前学习集的卡片分布，并跳转到管理或复习页面。</p>
        </div>
        <div class="study-set-detail__panel-actions">
          <el-button @click="loadFlashcards">刷新</el-button>
          <el-button type="success" @click="goStudy">开始复习</el-button>
          <el-button type="primary" @click="goFlashcards">管理闪卡</el-button>
        </div>
      </div>

      <div class="study-set-detail__source-grid">
        <article class="study-set-detail__source-card">
          <h4>到期卡片</h4>
          <p>{{ dueFlashcardsCount }} 张</p>
        </article>
        <article class="study-set-detail__source-card">
          <h4>标准卡</h4>
          <p>{{ flashcardsByType.standard }} 张</p>
        </article>
        <article class="study-set-detail__source-card">
          <h4>特殊卡</h4>
          <p>{{ flashcards.length - flashcardsByType.standard }} 张</p>
        </article>
      </div>

      <div v-if="flashcardsLoading" class="study-set-detail__empty">正在加载闪卡...</div>
      <div v-else-if="!flashcards.length" class="study-set-detail__empty">当前还没有闪卡。</div>

      <div v-else class="study-set-detail__list">
        <article v-for="card in flashcards.slice(0, 8)" :key="card.id" class="study-set-detail__item-card">
          <header>
            <strong>{{ card.frontText || "无提示" }}</strong>
            <el-tag size="small" effect="plain">{{ cardTypeLabel(card.cardType) }}</el-tag>
          </header>
          <p>{{ flashcardPreview(card) }}</p>
          <footer>{{ formatDateTime(card.dueAt) }}</footer>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'quiz'" class="study-set-detail__panel">
      <div class="study-set-detail__panel-head">
        <div>
          <h3>测验</h3>
          <p>查看历史测验、作答次数，并跳转到测验模块继续练习。</p>
        </div>
        <div class="study-set-detail__panel-actions">
          <el-button @click="loadQuizzes">刷新</el-button>
          <el-button type="primary" @click="goQuiz">进入测验</el-button>
        </div>
      </div>

      <div v-if="quizzesLoading" class="study-set-detail__empty">正在加载测验...</div>
      <div v-else-if="!quizzes.length" class="study-set-detail__empty">当前还没有测验记录。</div>

      <div v-else class="study-set-detail__list">
        <article v-for="quiz in quizzes.slice(0, 8)" :key="quiz.id" class="study-set-detail__item-card">
          <header>
            <strong>{{ quiz.title }}</strong>
            <el-tag size="small" type="warning">{{ quiz.questionCount }} 题</el-tag>
          </header>
          <p>{{ quiz.questionTypes.join(" / ") }}</p>
          <footer>{{ quiz.attemptCount }} 次作答 · {{ formatDateTime(quiz.updatedAt) }}</footer>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'notes'" class="study-set-detail__panel">
      <div class="study-set-detail__panel-head">
        <div>
          <h3>学习笔记</h3>
          <p>支持置顶、颜色标记、来源类型与文档关联。</p>
        </div>
        <div class="study-set-detail__panel-actions">
          <el-button @click="loadNotes">刷新</el-button>
          <el-button type="primary" @click="openCreateNoteDialog">新建笔记</el-button>
        </div>
      </div>

      <div v-if="notesLoading" class="study-set-detail__empty">正在加载笔记...</div>
      <div v-else-if="!notes.length" class="study-set-detail__empty">当前还没有笔记。</div>

      <div v-else class="study-set-detail__list">
        <article
          v-for="note in notes"
          :key="note.id"
          class="study-set-detail__note-card"
          :style="{ borderLeftColor: noteColor(note.colorToken) }"
        >
          <header class="study-set-detail__item-head">
            <div>
              <h4>{{ note.title }}</h4>
              <p>
                <el-tag v-if="note.isPinned" size="small" type="warning">置顶</el-tag>
                <el-tag size="small" effect="plain">{{ note.sourceType || "manual" }}</el-tag>
                <span v-if="note.sourceDocumentName" class="study-set-detail__meta-text">
                  来源文档：{{ note.sourceDocumentName }}
                </span>
              </p>
            </div>
            <div class="study-set-detail__inline-actions">
              <el-button text @click="openEditNoteDialog(note)">编辑</el-button>
              <el-button text type="danger" @click="removeNote(note)">删除</el-button>
            </div>
          </header>
          <p class="study-set-detail__content">{{ note.content }}</p>
          <footer class="study-set-detail__meta-text">更新于：{{ formatDateTime(note.updatedAt) }}</footer>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'documents'" class="study-set-detail__panel">
      <div class="study-set-detail__panel-head">
        <div>
          <h3>学习文档</h3>
          <p>支持真实文件上传，也支持手工录入文档文本。</p>
        </div>
        <div class="study-set-detail__panel-actions">
          <el-button @click="loadDocuments">刷新</el-button>
          <el-button @click="triggerDocumentFilePicker">上传文件</el-button>
          <el-button type="primary" @click="openCreateDocumentDialog">手工录入</el-button>
        </div>
      </div>

      <div v-if="documentsLoading" class="study-set-detail__empty">正在加载文档...</div>
      <div v-else-if="!documents.length" class="study-set-detail__empty">当前还没有关联文档。</div>

      <div v-else class="study-set-detail__list">
        <article v-for="document in documents" :key="document.id" class="study-set-detail__item-card">
          <header>
            <strong>{{ document.name }}</strong>
            <el-tag size="small" effect="plain">{{ document.sourceType }}</el-tag>
          </header>
          <p>{{ document.summary || "暂无摘要" }}</p>
          <footer>{{ document.chunkCount }} 段 · {{ formatDateTime(document.createdAt) }}</footer>
        </article>
      </div>
    </section>

    <section v-else class="study-set-detail__panel">
      <div class="study-set-detail__panel-head">
        <div>
          <h3>知识来源</h3>
          <p>在当前学习集的文档与笔记范围内检索来源片段，可直接带到聊天页。</p>
        </div>
        <div class="study-set-detail__panel-actions">
          <el-button :disabled="!sourceQuery.trim()" @click="openChatWithContext">带结果去聊天</el-button>
        </div>
      </div>

      <div class="study-set-detail__source-toolbar">
        <el-input
          v-model="sourceQuery"
          clearable
          placeholder="输入关键词，例如：极限定义、导数、重点公式"
          @keyup.enter="handleSourceSearch"
          @clear="handleSourceSearch"
        />
        <el-button :loading="sourcesLoading" @click="handleSourceSearch">检索来源</el-button>
      </div>

      <div class="study-set-detail__source-grid">
        <article class="study-set-detail__source-card">
          <h4>关联文档</h4>
          <p>{{ sourceSummary.documents.length }} 份</p>
        </article>
        <article class="study-set-detail__source-card">
          <h4>关联笔记</h4>
          <p>{{ sourceSummary.notes.length }} 条</p>
        </article>
        <article class="study-set-detail__source-card">
          <h4>检索命中</h4>
          <p>{{ sourceSummary.chunks.length }} 段</p>
        </article>
      </div>

      <div v-if="sourceQuery.trim() && !sourceSummary.chunks.length && !sourcesLoading" class="study-set-detail__empty">
        当前关键词没有命中来源片段。
      </div>

      <div v-if="sourceSummary.chunks.length" class="study-set-detail__list">
        <article v-for="chunk in sourceSummary.chunks" :key="chunk.id" class="study-set-detail__item-card">
          <header>
            <strong>{{ chunk.sourceName }}</strong>
            <el-tag size="small">{{ chunk.sourceType }}</el-tag>
          </header>
          <p>{{ chunk.content }}</p>
          <footer>第 {{ chunk.chunkIndex + 1 }} 段</footer>
        </article>
      </div>
    </section>

    <el-dialog v-model="noteDialog.visible" :title="noteDialog.mode === 'create' ? '新建笔记' : '编辑笔记'" width="720px">
      <el-form label-position="top">
        <el-form-item label="标题">
          <el-input v-model="noteDialog.form.title" maxlength="160" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="noteDialog.form.content" type="textarea" :rows="8" maxlength="50000" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="颜色标记">
              <el-select v-model="noteDialog.form.colorToken">
                <el-option label="琥珀" value="amber" />
                <el-option label="天空蓝" value="sky" />
                <el-option label="翡翠" value="emerald" />
                <el-option label="玫瑰" value="rose" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="来源类型">
              <el-select v-model="noteDialog.form.sourceType">
                <el-option label="手工整理" value="manual" />
                <el-option label="课程摘要" value="summary" />
                <el-option label="重点摘录" value="quote" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关联文档">
              <el-select v-model="noteDialog.form.sourceDocumentId" clearable placeholder="可选">
                <el-option v-for="document in documents" :key="document.id" :label="document.name" :value="document.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="置顶">
          <el-switch v-model="noteDialog.form.isPinned" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="noteDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="noteDialog.saving" @click="submitNoteDialog">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="documentDialog.visible" title="手工录入文档" width="720px">
      <el-form label-position="top">
        <el-form-item label="文档名称">
          <el-input v-model="documentDialog.form.name" maxlength="255" placeholder="例如：高数第二章课堂整理.md" />
        </el-form-item>
        <el-form-item label="文档内容">
          <el-input v-model="documentDialog.form.contentText" type="textarea" :rows="10" maxlength="500000" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="来源类型">
              <el-select v-model="documentDialog.form.sourceType">
                <el-option label="文本" value="text" />
                <el-option label="Markdown" value="markdown" />
                <el-option label="讲义摘录" value="lecture" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="MIME 类型">
              <el-input v-model="documentDialog.form.mimeType" maxlength="120" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="documentDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="documentDialog.saving" @click="submitDocumentDialog">保存</el-button>
      </template>
    </el-dialog>

    <input ref="documentFileInputRef" type="file" class="hidden-file-input" multiple @change="handleDocumentFileChange" />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  createStudySetDocument,
  createStudySetNote,
  deleteStudySetNote,
  fetchFlashcards,
  fetchQuizAttempts,
  fetchStudySetDetail,
  fetchStudySetDocuments,
  fetchStudySetNotes,
  fetchStudySetQuizzes,
  fetchStudySetSources,
  updateStudySetNote
} from "@/services/api.js";
import { readFileAsBase64, readFileAsText, shouldReadAsText } from "@/utils/workspaceFormatters.js";

const route = useRoute();
const router = useRouter();

const studySetId = computed(() => String(route.params.id || ""));
const activeTab = ref(String(route.query.section || "flashcards"));
const studySet = ref(null);
const flashcards = ref([]);
const quizzes = ref([]);
const notes = ref([]);
const documents = ref([]);
const sourceSummary = ref({
  documents: [],
  notes: [],
  chunks: []
});
const sourceQuery = ref(String(route.query.query || ""));
const flashcardsLoading = ref(false);
const quizzesLoading = ref(false);
const notesLoading = ref(false);
const documentsLoading = ref(false);
const sourcesLoading = ref(false);
const documentFileInputRef = ref(null);

const noteDialog = reactive({
  visible: false,
  mode: "create",
  saving: false,
  editId: "",
  form: {
    title: "",
    content: "",
    colorToken: "amber",
    isPinned: false,
    sourceType: "manual",
    sourceDocumentId: ""
  }
});

const documentDialog = reactive({
  visible: false,
  saving: false,
  form: {
    name: "",
    contentText: "",
    sourceType: "text",
    mimeType: "text/plain"
  }
});

const navItems = computed(() => [
  { key: "flashcards", label: "闪卡", count: `${flashcards.value.length} 张` },
  { key: "quiz", label: "测验", count: `${quizzes.value.length} 份` },
  { key: "notes", label: "笔记", count: `${notes.value.length} 条` },
  { key: "documents", label: "文档", count: `${documents.value.length} 份` },
  { key: "sources", label: "来源", count: `${sourceSummary.value.chunks.length} 段` }
]);

const dueFlashcardsCount = computed(() =>
  flashcards.value.filter((item) => new Date(item.dueAt).getTime() <= Date.now()).length
);

const flashcardsByType = computed(() =>
  flashcards.value.reduce(
    (acc, item) => {
      acc[item.cardType] = (acc[item.cardType] || 0) + 1;
      return acc;
    },
    { standard: 0, cloze: 0, image_occlusion: 0 }
  )
);

function cardTypeLabel(cardType) {
  if (cardType === "cloze") {
    return "完形填空";
  }
  if (cardType === "image_occlusion") {
    return "图片遮挡";
  }
  return "标准卡";
}

function flashcardPreview(card) {
  if (card.cardType === "cloze") {
    return (card.extraData?.templateText || "").replace(/\{\{(.*?)\}\}/g, "____").slice(0, 120) || "无模板";
  }
  if (card.cardType === "image_occlusion") {
    return `${(card.extraData?.masks || []).length} 个遮挡区`;
  }
  return (card.backText || "").slice(0, 120) || "无背面内容";
}

function resetNoteDialog() {
  noteDialog.editId = "";
  noteDialog.form.title = "";
  noteDialog.form.content = "";
  noteDialog.form.colorToken = "amber";
  noteDialog.form.isPinned = false;
  noteDialog.form.sourceType = "manual";
  noteDialog.form.sourceDocumentId = "";
}

function resetDocumentDialog() {
  documentDialog.form.name = "";
  documentDialog.form.contentText = "";
  documentDialog.form.sourceType = "text";
  documentDialog.form.mimeType = "text/plain";
}

function noteColor(colorToken) {
  if (colorToken === "sky") {
    return "#0ea5e9";
  }
  if (colorToken === "emerald") {
    return "#10b981";
  }
  if (colorToken === "rose") {
    return "#f43f5e";
  }
  return "#f59e0b";
}

async function loadStudySet() {
  studySet.value = await fetchStudySetDetail(studySetId.value);
}

async function loadFlashcards() {
  flashcardsLoading.value = true;
  try {
    flashcards.value = await fetchFlashcards(studySetId.value, { limit: 200 });
  } finally {
    flashcardsLoading.value = false;
  }
}

async function loadQuizzes() {
  quizzesLoading.value = true;
  try {
    const list = await fetchStudySetQuizzes(studySetId.value);
    quizzes.value = await Promise.all(
      list.map(async (quiz) => {
        const attempts = await fetchQuizAttempts(quiz.id);
        return {
          ...quiz,
          latestAttempt: attempts[0] || null
        };
      })
    );
  } finally {
    quizzesLoading.value = false;
  }
}

async function loadNotes() {
  notesLoading.value = true;
  try {
    notes.value = await fetchStudySetNotes(studySetId.value);
  } finally {
    notesLoading.value = false;
  }
}

async function loadDocuments() {
  documentsLoading.value = true;
  try {
    documents.value = await fetchStudySetDocuments(studySetId.value);
  } finally {
    documentsLoading.value = false;
  }
}

async function loadSources() {
  sourcesLoading.value = true;
  try {
    sourceSummary.value = await fetchStudySetSources(studySetId.value, {
      query: sourceQuery.value.trim(),
      topK: 8
    });
  } finally {
    sourcesLoading.value = false;
  }
}

function openCreateNoteDialog() {
  noteDialog.mode = "create";
  noteDialog.visible = true;
  resetNoteDialog();
}

function openEditNoteDialog(note) {
  noteDialog.mode = "edit";
  noteDialog.visible = true;
  noteDialog.editId = note.id;
  noteDialog.form.title = note.title || "";
  noteDialog.form.content = note.content || "";
  noteDialog.form.colorToken = note.colorToken || "amber";
  noteDialog.form.isPinned = Boolean(note.isPinned);
  noteDialog.form.sourceType = note.sourceType || "manual";
  noteDialog.form.sourceDocumentId = note.sourceDocumentId || "";
}

async function submitNoteDialog() {
  if (!noteDialog.form.title.trim() || !noteDialog.form.content.trim()) {
    ElMessage.warning("笔记标题和内容不能为空");
    return;
  }

  noteDialog.saving = true;
  try {
    const payload = {
      title: noteDialog.form.title.trim(),
      content: noteDialog.form.content.trim(),
      colorToken: noteDialog.form.colorToken,
      isPinned: noteDialog.form.isPinned,
      sourceType: noteDialog.form.sourceType,
      sourceDocumentId: noteDialog.form.sourceDocumentId
    };

    if (noteDialog.mode === "create") {
      await createStudySetNote(studySetId.value, payload);
      ElMessage.success("笔记已创建");
    } else {
      await updateStudySetNote(noteDialog.editId, payload);
      ElMessage.success("笔记已更新");
    }

    noteDialog.visible = false;
    await Promise.all([loadNotes(), loadSources()]);
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "保存笔记失败");
  } finally {
    noteDialog.saving = false;
  }
}

async function removeNote(note) {
  try {
    await ElMessageBox.confirm(`确认删除笔记「${note.title}」吗？`, "删除确认", { type: "warning" });
    await deleteStudySetNote(note.id);
    ElMessage.success("笔记已删除");
    await Promise.all([loadNotes(), loadSources()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error?.response?.data?.message || error?.message || "删除笔记失败");
    }
  }
}

function openCreateDocumentDialog() {
  documentDialog.visible = true;
  resetDocumentDialog();
}

async function submitDocumentDialog() {
  if (!documentDialog.form.name.trim() || !documentDialog.form.contentText.trim()) {
    ElMessage.warning("文档名称和内容不能为空");
    return;
  }

  documentDialog.saving = true;
  try {
    await createStudySetDocument(studySetId.value, {
      name: documentDialog.form.name.trim(),
      sourceType: documentDialog.form.sourceType,
      mimeType: documentDialog.form.mimeType.trim() || "text/plain",
      contentText: documentDialog.form.contentText.trim()
    });
    documentDialog.visible = false;
    ElMessage.success("文档已创建");
    await Promise.all([loadDocuments(), loadSources()]);
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "创建文档失败");
  } finally {
    documentDialog.saving = false;
  }
}

function triggerDocumentFilePicker() {
  documentFileInputRef.value?.click();
}

async function handleDocumentFileChange(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";
  if (!files.length) {
    return;
  }

  documentsLoading.value = true;
  try {
    for (const file of files) {
      const contentText = shouldReadAsText(file) ? await readFileAsText(file) : await readFileAsBase64(file);
      await createStudySetDocument(studySetId.value, {
        name: file.name,
        sourceType: "upload",
        mimeType: file.type || "application/octet-stream",
        contentText
      });
    }
    ElMessage.success(`已上传 ${files.length} 份文档`);
    await Promise.all([loadDocuments(), loadSources()]);
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "上传文档失败");
  } finally {
    documentsLoading.value = false;
  }
}

function handleSourceSearch() {
  loadSources();
}

function goBack() {
  router.push({ name: "study-sets" });
}

function goFlashcards() {
  router.push({ name: "study-set-flashcards", params: { id: studySetId.value } });
}

function goStudy() {
  router.push({ name: "study-session", params: { id: studySetId.value } });
}

function goQuiz() {
  router.push({ name: "study-set-quiz", params: { id: studySetId.value } });
}

function openChatWithContext() {
  router.push({
    name: "chat",
    query: {
      studySetId: studySetId.value,
      sourceQuery: sourceQuery.value.trim() || ""
    }
  });
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

watch(
  () => route.query.section,
  (value) => {
    const nextSection = String(value || "flashcards");
    if (activeTab.value !== nextSection) {
      activeTab.value = nextSection;
    }
  }
);

watch(activeTab, (value) => {
  if (route.query.section === value) {
    return;
  }
  router.replace({
    query: {
      ...route.query,
      section: value
    }
  });
});

onMounted(async () => {
  try {
    await Promise.all([loadStudySet(), loadFlashcards(), loadQuizzes(), loadNotes(), loadDocuments(), loadSources()]);
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "加载学习集详情失败");
  }
});
</script>

<style scoped>
.study-set-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.study-set-detail__header,
.study-set-detail__panel-head,
.study-set-detail__item-head,
.study-set-detail__item-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.study-set-detail__header h2,
.study-set-detail__panel-head h3,
.study-set-detail__note-card h4,
.study-set-detail__source-card h4 {
  margin: 0;
}

.study-set-detail__header p,
.study-set-detail__panel-head p,
.study-set-detail__item-card p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.study-set-detail__actions,
.study-set-detail__panel-actions,
.study-set-detail__inline-actions,
.study-set-detail__source-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.study-set-detail__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.study-set-detail__summary-card,
.study-set-detail__panel,
.study-set-detail__nav-item,
.study-set-detail__source-card,
.study-set-detail__item-card,
.study-set-detail__note-card {
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  background: var(--bg-overlay-strong);
}

.study-set-detail__summary-card,
.study-set-detail__panel {
  padding: 18px;
}

.study-set-detail__summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.study-set-detail__summary-card strong {
  font-size: 28px;
}

.study-set-detail__summary-card span,
.study-set-detail__empty,
.study-set-detail__meta-text,
.study-set-detail__nav-item span,
.study-set-detail__item-card footer {
  color: var(--text-secondary);
}

.study-set-detail__nav {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.study-set-detail__nav-item {
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
}

.study-set-detail__nav-item--active {
  box-shadow: inset 0 0 0 2px rgba(14, 165, 233, 0.25);
}

.study-set-detail__nav-item strong {
  display: block;
  margin-bottom: 4px;
}

.study-set-detail__source-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;
}

.study-set-detail__source-card,
.study-set-detail__item-card,
.study-set-detail__note-card {
  padding: 14px;
}

.study-set-detail__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.study-set-detail__item-card p,
.study-set-detail__content {
  white-space: pre-wrap;
  line-height: 1.7;
}

.study-set-detail__note-card {
  border-left: 6px solid #f59e0b;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 1100px) {
  .study-set-detail__summary,
  .study-set-detail__nav,
  .study-set-detail__source-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .study-set-detail__header,
  .study-set-detail__panel-head,
  .study-set-detail__item-head,
  .study-set-detail__item-card header {
    flex-direction: column;
    align-items: flex-start;
  }

  .study-set-detail__summary,
  .study-set-detail__nav,
  .study-set-detail__source-grid {
    grid-template-columns: 1fr;
  }
}
</style>
