<template>
  <section class="notes-page">
    <header class="notes-page__hero surface-card">
      <div class="notes-page__hero-main">
        <span class="notes-page__eyebrow">Notes Hub</span>
        <h2>笔记中心</h2>
        <p>集中管理学习集中沉淀下来的所有笔记，保留当前项目的仪表盘风格，同时把浏览、筛选和重点内容展示做得更清晰。</p>
      </div>

      <div class="notes-page__hero-actions">
        <el-button @click="reload">刷新</el-button>
        <el-button type="primary" :disabled="!studySets.length" @click="openCreatePage">新建笔记</el-button>
        <el-button type="success" plain :disabled="!studySets.length" @click="openGeneratePage">AI 生成</el-button>
      </div>
    </header>

    <section class="notes-page__stats">
      <article class="surface-card notes-page__stat-card">
        <span>总笔记数</span>
        <strong>{{ notes.length }}</strong>
        <p>所有学习集的已收录笔记</p>
      </article>
      <article class="surface-card notes-page__stat-card">
        <span>置顶重点</span>
        <strong>{{ pinnedCount }}</strong>
        <p>优先保留的核心内容</p>
      </article>
      <article class="surface-card notes-page__stat-card">
        <span>AI 生成</span>
        <strong>{{ aiGeneratedCount }}</strong>
        <p>由系统自动聚合整理的笔记</p>
      </article>
      <article class="surface-card notes-page__stat-card">
        <span>覆盖学习集</span>
        <strong>{{ coveredStudySets }}</strong>
        <p>当前已有笔记沉淀的学习主题</p>
      </article>
    </section>

    <section class="surface-card notes-page__filters">
      <div class="notes-page__filters-head">
        <div>
          <h3>筛选与搜索</h3>
          <p>快速定位某个学习集、某类来源或当前置顶内容。</p>
        </div>
        <el-switch v-model="pinnedOnly" inline-prompt active-text="置顶" inactive-text="全部" />
      </div>

      <div class="notes-page__filters-grid">
        <el-input
          v-model="searchText"
          clearable
          placeholder="搜索标题、正文或学习集名称"
        />

        <el-select v-model="studySetFilter" clearable placeholder="全部学习集">
          <el-option
            v-for="studySet in studySets"
            :key="studySet.id"
            :label="studySet.title"
            :value="studySet.id"
          />
        </el-select>

        <el-select v-model="sourceTypeFilter" clearable placeholder="来源类型">
          <el-option
            v-for="item in sourceTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </section>

    <div v-if="loading" class="surface-card notes-page__empty">正在加载笔记...</div>
    <div v-else-if="!studySets.length" class="surface-card notes-page__empty">
      当前还没有学习集，请先创建学习集后再管理笔记。
    </div>
    <div v-else-if="!filteredNotes.length" class="surface-card notes-page__empty">
      当前筛选条件下没有匹配的笔记，试试调整搜索词或放宽过滤条件。
    </div>

    <template v-else>
      <section class="notes-page__section-head">
        <div>
          <h3>笔记列表</h3>
          <p>共 {{ filteredNotes.length }} 条结果，按置顶优先和最近更新时间排序。</p>
        </div>
        <div class="notes-page__legend">
          <span><i class="notes-page__legend-dot notes-page__legend-dot--pinned"></i>置顶优先</span>
          <span><i class="notes-page__legend-dot notes-page__legend-dot--ai"></i>AI 整理</span>
        </div>
      </section>

      <div class="notes-page__grid">
        <article
          v-for="note in filteredNotes"
          :key="note.id"
          class="surface-card notes-page__card"
          :style="{ borderTopColor: noteColor(note.colorToken) }"
          @click="openDetail(note.id)"
        >
          <header class="notes-page__card-head">
            <div class="notes-page__card-title-wrap">
              <div class="notes-page__card-tags">
                <el-tag v-if="note.isPinned" size="small" type="warning">置顶</el-tag>
                <el-tag size="small" effect="plain">{{ sourceTypeLabel(note.sourceType) }}</el-tag>
              </div>
              <h4>{{ note.title }}</h4>
              <p>{{ note.studySetTitle || note.studySetId }}</p>
            </div>

            <button
              type="button"
              class="notes-page__pin-toggle"
              :class="{ 'notes-page__pin-toggle--active': note.isPinned }"
              @click.stop="togglePinned(note)"
            >
              {{ note.isPinned ? "已置顶" : "置顶" }}
            </button>
          </header>

          <p class="notes-page__excerpt">{{ excerpt(note.content) }}</p>

          <div class="notes-page__meta-row">
            <span class="notes-page__meta-chip">{{ colorLabel(note.colorToken) }}</span>
            <span class="notes-page__meta-chip">{{ note.sourceDocumentName || "无外部文档" }}</span>
          </div>

          <footer class="notes-page__card-foot">
            <span>{{ formatDateTime(note.updatedAt) }}</span>
            <div class="notes-page__card-actions">
              <el-button text @click.stop="openEdit(note.id)">编辑</el-button>
              <el-button text type="danger" @click.stop="removeNote(note)">删除</el-button>
            </div>
          </footer>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { useNotesStore } from "@/stores/notes.js";
import { useStudySetsStore } from "@/stores/studySets.js";

const router = useRouter();
const notesStore = useNotesStore();
const studySetsStore = useStudySetsStore();
const { items: notes, loading } = storeToRefs(notesStore);
const { items: studySets } = storeToRefs(studySetsStore);

const searchText = ref("");
const studySetFilter = ref("");
const sourceTypeFilter = ref("");
const pinnedOnly = ref(false);

const sourceTypeOptions = [
  { label: "手动整理", value: "manual" },
  { label: "AI 生成", value: "ai_generated" },
  { label: "摘要聚合", value: "summary" },
  { label: "PDF", value: "pdf" },
  { label: "网站", value: "website" },
  { label: "YouTube", value: "youtube" },
  { label: "音频", value: "audio" },
  { label: "手写内容", value: "handwriting" }
];

const filteredNotes = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();

  return notes.value.filter((note) => {
    if (studySetFilter.value && note.studySetId !== studySetFilter.value) {
      return false;
    }

    if (sourceTypeFilter.value && note.sourceType !== sourceTypeFilter.value) {
      return false;
    }

    if (pinnedOnly.value && !note.isPinned) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [note.title, note.content, note.studySetTitle, note.sourceDocumentName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });
});

const pinnedCount = computed(() => notes.value.filter((note) => note.isPinned).length);
const aiGeneratedCount = computed(() => notes.value.filter((note) => note.sourceType === "ai_generated").length);
const coveredStudySets = computed(() => new Set(notes.value.map((note) => note.studySetId)).size);

function noteColor(colorToken) {
  return (
    {
      amber: "#f59e0b",
      sky: "#0ea5e9",
      emerald: "#10b981",
      rose: "#f43f5e"
    }[colorToken] || "#0ea5e9"
  );
}

function colorLabel(colorToken) {
  return (
    {
      amber: "琥珀",
      sky: "天蓝",
      emerald: "翡翠",
      rose: "玫瑰"
    }[colorToken] || colorToken || "默认"
  );
}

function sourceTypeLabel(sourceType) {
  return sourceTypeOptions.find((item) => item.value === sourceType)?.label || sourceType || "手动整理";
}

function excerpt(content) {
  const plain = String(content || "").replace(/\s+/g, " ").trim();
  return plain.length > 156 ? `${plain.slice(0, 156)}...` : plain || "暂无正文内容";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function targetQuery() {
  return studySetFilter.value ? { studySetId: studySetFilter.value } : undefined;
}

function openCreatePage() {
  router.push({ name: "note-create", query: targetQuery() });
}

function openGeneratePage() {
  router.push({ name: "note-generate", query: targetQuery() });
}

function openDetail(noteId) {
  router.push({ name: "note-detail", params: { noteId } });
}

function openEdit(noteId) {
  router.push({ name: "note-edit", params: { noteId } });
}

async function togglePinned(note) {
  const nextPinned = !note.isPinned;

  try {
    await notesStore.updateNote(note.id, {
      title: note.title,
      content: note.content,
      colorToken: note.colorToken,
      isPinned: nextPinned,
      sourceType: note.sourceType,
      sourceDocumentId: note.sourceDocumentId
    });
    ElMessage.success(nextPinned ? "已设为置顶" : "已取消置顶");
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "更新置顶状态失败");
  }
}

async function removeNote(note) {
  try {
    await ElMessageBox.confirm(`确认删除笔记《${note.title}》吗？`, "删除确认", {
      type: "warning"
    });
    await notesStore.deleteNote(note.id);
    ElMessage.success("笔记已删除");
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error?.response?.data?.message || error?.message || "删除笔记失败");
    }
  }
}

async function reload() {
  if (!studySets.value.length) {
    await studySetsStore.fetchStudySets();
  }
  await notesStore.fetchAllNotes();
}

onMounted(reload);
</script>

<style scoped>
.notes-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.surface-card {
  border-radius: 28px;
  border: 1px solid var(--border-light);
  background: var(--bg-overlay-strong);
  box-shadow: var(--shadow-card);
}

.notes-page__hero,
.notes-page__hero-actions,
.notes-page__filters-head,
.notes-page__section-head,
.notes-page__card-head,
.notes-page__card-foot,
.notes-page__legend,
.notes-page__filters-grid,
.notes-page__meta-row,
.notes-page__card-tags,
.notes-page__card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notes-page__hero {
  justify-content: space-between;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.16), transparent 24%),
    radial-gradient(circle at bottom left, rgba(14, 165, 233, 0.12), transparent 20%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(245, 252, 255, 0.9));
}

.notes-page__eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  color: var(--brand-blue);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.notes-page__hero h2,
.notes-page__filters-head h3,
.notes-page__section-head h3,
.notes-page__card-head h4 {
  margin: 0;
}

.notes-page__hero p,
.notes-page__filters-head p,
.notes-page__section-head p,
.notes-page__card-head p,
.notes-page__stat-card p,
.notes-page__excerpt,
.notes-page__card-foot span,
.notes-page__empty {
  margin: 0;
  color: var(--text-secondary);
}

.notes-page__hero-main {
  max-width: 760px;
}

.notes-page__hero p {
  margin-top: 10px;
  line-height: 1.75;
}

.notes-page__hero-actions {
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.notes-page__stats,
.notes-page__grid {
  display: grid;
  gap: 16px;
}

.notes-page__stats {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.notes-page__grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.notes-page__stat-card,
.notes-page__filters,
.notes-page__card,
.notes-page__empty {
  padding: 22px;
}

.notes-page__stat-card span {
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.notes-page__stat-card strong {
  display: block;
  margin: 10px 0 8px;
  font-size: 30px;
  line-height: 1;
}

.notes-page__filters-head,
.notes-page__section-head,
.notes-page__card-head,
.notes-page__card-foot {
  justify-content: space-between;
}

.notes-page__filters-grid {
  margin-top: 18px;
}

.notes-page__filters-grid :deep(.el-input),
.notes-page__filters-grid :deep(.el-select) {
  flex: 1;
}

.notes-page__legend {
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: 13px;
}

.notes-page__legend span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.notes-page__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.notes-page__legend-dot--pinned {
  background: #f59e0b;
}

.notes-page__legend-dot--ai {
  background: #10b981;
}

.notes-page__card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  cursor: pointer;
  border-top: 5px solid var(--brand-blue);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.notes-page__card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-elevated);
}

.notes-page__card-title-wrap {
  min-width: 0;
}

.notes-page__card-tags {
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.notes-page__card-head h4 {
  line-height: 1.4;
}

.notes-page__card-head p {
  margin-top: 6px;
}

.notes-page__pin-toggle {
  flex-shrink: 0;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.16s ease;
}

.notes-page__pin-toggle:hover,
.notes-page__pin-toggle--active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.notes-page__excerpt {
  min-height: 88px;
  line-height: 1.75;
}

.notes-page__meta-row {
  flex-wrap: wrap;
}

.notes-page__meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-secondary);
  font-size: 12px;
}

.notes-page__card-foot {
  align-items: flex-end;
}

.notes-page__empty {
  text-align: center;
}

@media (max-width: 980px) {
  .notes-page__hero,
  .notes-page__hero-actions,
  .notes-page__filters-head,
  .notes-page__filters-grid,
  .notes-page__section-head,
  .notes-page__card-foot {
    align-items: flex-start;
    flex-direction: column;
  }

  .notes-page__filters-grid :deep(.el-input),
  .notes-page__filters-grid :deep(.el-select) {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .notes-page__card-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
