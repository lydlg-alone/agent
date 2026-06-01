<template>
  <section class="note-detail-page">
    <div v-if="detailLoading" class="note-detail-page__empty">正在加载笔记...</div>
    <div v-else-if="!note" class="note-detail-page__empty">笔记不存在或已被删除。</div>
    <template v-else>
      <header class="note-detail-page__hero surface-card">
        <div class="note-detail-page__hero-main">
          <button type="button" class="note-detail-page__back" @click="goBack">返回笔记中心</button>
          <div class="note-detail-page__hero-tags">
            <el-tag v-if="note.isPinned" size="small" type="warning">置顶</el-tag>
            <el-tag size="small" effect="plain">{{ note.studySetTitle || note.studySetId }}</el-tag>
            <el-tag size="small" effect="plain">{{ sourceTypeLabel(note.sourceType) }}</el-tag>
            <el-tag size="small" effect="plain">{{ colorLabel(note.colorToken) }}</el-tag>
          </div>
          <h2>{{ note.title }}</h2>
          <p>{{ excerpt(note.content) }}</p>
        </div>

        <div class="note-detail-page__hero-actions">
          <el-button @click="goBack">返回</el-button>
          <el-button @click="copyContent">复制内容</el-button>
          <el-button v-if="note.studySetId" @click="openStudySet">打开学习集</el-button>
          <el-button type="primary" @click="openEdit">编辑</el-button>
          <el-button type="danger" plain @click="removeCurrentNote">删除</el-button>
        </div>
      </header>

      <section class="note-detail-page__layout">
        <div class="note-detail-page__main">
          <section class="surface-card note-detail-page__viewer">
            <div class="note-detail-page__viewer-head">
              <div>
                <h3>笔记内容</h3>
                <p>可切换为正文、思维导图或演示视图。</p>
              </div>
              <div class="note-detail-page__view-switcher">
                <button
                  v-for="item in viewOptions"
                  :key="item.value"
                  type="button"
                  class="note-detail-page__view-button"
                  :class="{ 'note-detail-page__view-button--active': activeView === item.value }"
                  @click="activeView = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <article
              v-if="activeView === 'note'"
              class="note-detail-page__content"
              v-html="renderedHtml"
            ></article>
            <NoteMindMapView v-else-if="activeView === 'mindmap'" :title="note.title" :content="note.content" />
            <NotePresentationView v-else :title="note.title" :content="note.content" />
          </section>
        </div>

        <aside class="note-detail-page__sidebar">
          <section class="surface-card note-detail-page__panel">
            <div class="note-detail-page__panel-head">
              <h3>笔记状态</h3>
              <span>{{ note.isPinned ? "重点保留" : "常规笔记" }}</span>
            </div>
            <dl class="note-detail-page__meta-list">
              <div>
                <dt>创建时间</dt>
                <dd>{{ formatDateTime(note.createdAt) }}</dd>
              </div>
              <div>
                <dt>最近更新</dt>
                <dd>{{ formatDateTime(note.updatedAt) }}</dd>
              </div>
              <div>
                <dt>来源类型</dt>
                <dd>{{ sourceTypeLabel(note.sourceType) }}</dd>
              </div>
              <div>
                <dt>内容长度</dt>
                <dd>{{ contentStats }}</dd>
              </div>
            </dl>
          </section>

          <section class="surface-card note-detail-page__panel">
            <div class="note-detail-page__panel-head">
              <h3>关联信息</h3>
              <span>学习上下文</span>
            </div>
            <dl class="note-detail-page__meta-list">
              <div>
                <dt>学习集</dt>
                <dd>{{ note.studySetTitle || note.studySetId || "-" }}</dd>
              </div>
              <div>
                <dt>文档来源</dt>
                <dd>{{ note.sourceDocumentName || "手动输入或自动聚合" }}</dd>
              </div>
              <div>
                <dt>强调色</dt>
                <dd>{{ colorLabel(note.colorToken) }}</dd>
              </div>
            </dl>
          </section>

          <section class="surface-card note-detail-page__panel">
            <div class="note-detail-page__panel-head">
              <h3>快捷操作</h3>
              <span>持续整理</span>
            </div>
            <div class="note-detail-page__quick-actions">
              <button type="button" class="note-detail-page__quick-button" @click="togglePinned">
                <strong>{{ note.isPinned ? "取消置顶" : "设为置顶" }}</strong>
                <span>调整这条笔记在列表中的优先级</span>
              </button>
              <button type="button" class="note-detail-page__quick-button" @click="openEdit">
                <strong>继续编辑</strong>
                <span>补充正文、修改来源类型或更新重点内容</span>
              </button>
              <button
                v-if="note.studySetId"
                type="button"
                class="note-detail-page__quick-button"
                @click="openStudySet"
              >
                <strong>回到学习集</strong>
                <span>查看该学习集下的其他资料、卡片和笔记</span>
              </button>
            </div>
          </section>
        </aside>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { useNotesStore } from "@/stores/notes.js";
import NoteMindMapView from "@/components/notes/NoteMindMapView.vue";
import NotePresentationView from "@/components/notes/NotePresentationView.vue";
import { renderMarkdown } from "@/utils/markdownRenderer.js";

const route = useRoute();
const router = useRouter();
const notesStore = useNotesStore();
const { activeNote: note, detailLoading } = storeToRefs(notesStore);

const activeView = ref("note");
const viewOptions = [
  { label: "正文", value: "note" },
  { label: "思维导图", value: "mindmap" },
  { label: "演示视图", value: "presentation" }
];

const noteId = computed(() => String(route.params.noteId || ""));
const renderedHtml = computed(() => renderMarkdown(note.value?.content || ""));
const contentStats = computed(() => {
  const plainText = String(note.value?.content || "").replace(/\s+/g, "");
  const paragraphCount = String(note.value?.content || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  return `${plainText.length} 字 / ${paragraphCount || 1} 段`;
});

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function excerpt(content) {
  const plain = String(content || "").replace(/\s+/g, " ").trim();
  return plain.length > 160 ? `${plain.slice(0, 160)}...` : plain || "这条笔记还没有正文内容。";
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
  return (
    {
      manual: "手动整理",
      ai_generated: "AI 生成",
      summary: "摘要聚合",
      pdf: "PDF",
      website: "网站",
      youtube: "YouTube",
      audio: "音频",
      handwriting: "手写内容"
    }[sourceType] || sourceType || "手动整理"
  );
}

function goBack() {
  router.push({ name: "notes" });
}

function openStudySet() {
  if (!note.value?.studySetId) {
    return;
  }
  router.push({
    name: "study-set-detail",
    params: { id: note.value.studySetId },
    query: { section: "notes" }
  });
}

function openEdit() {
  router.push({ name: "note-edit", params: { noteId: noteId.value } });
}

async function copyContent() {
  if (!note.value) {
    return;
  }

  const text = `${note.value.title}\n\n${note.value.content || ""}`;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    ElMessage.success("笔记内容已复制");
  } catch (error) {
    ElMessage.error(error?.message || "复制失败");
  }
}

async function togglePinned() {
  if (!note.value) {
    return;
  }

  const nextPinned = !note.value.isPinned;

  try {
    await notesStore.updateNote(note.value.id, {
      title: note.value.title,
      content: note.value.content,
      colorToken: note.value.colorToken,
      isPinned: nextPinned,
      sourceType: note.value.sourceType,
      sourceDocumentId: note.value.sourceDocumentId
    });
    ElMessage.success(nextPinned ? "已设为置顶" : "已取消置顶");
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "更新笔记状态失败");
  }
}

async function removeCurrentNote() {
  if (!note.value) {
    return;
  }

  try {
    await ElMessageBox.confirm(`确认删除笔记《${note.value.title}》吗？`, "删除确认", {
      type: "warning"
    });
    await notesStore.deleteNote(note.value.id);
    ElMessage.success("笔记已删除");
    router.replace({ name: "notes" });
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error?.response?.data?.message || error?.message || "删除笔记失败");
    }
  }
}

onMounted(() => {
  notesStore.fetchNote(noteId.value);
});
</script>

<style scoped>
.note-detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.surface-card,
.note-detail-page__quick-button {
  border-radius: 28px;
  border: 1px solid var(--border-light);
  background: var(--bg-overlay-strong);
  box-shadow: var(--shadow-card);
}

.note-detail-page__hero,
.note-detail-page__hero-actions,
.note-detail-page__viewer-head,
.note-detail-page__panel-head,
.note-detail-page__hero-tags,
.note-detail-page__view-switcher {
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-detail-page__hero {
  justify-content: space-between;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(240, 249, 255, 0.9));
}

.note-detail-page__hero-main {
  min-width: 0;
}

.note-detail-page__back {
  margin-bottom: 14px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--brand-blue);
  font: inherit;
  cursor: pointer;
}

.note-detail-page__hero h2,
.note-detail-page__viewer-head h3,
.note-detail-page__panel-head h3 {
  margin: 0;
}

.note-detail-page__hero p,
.note-detail-page__viewer-head p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.75;
}

.note-detail-page__hero-actions {
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.note-detail-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.85fr);
  gap: 20px;
}

.note-detail-page__main,
.note-detail-page__sidebar {
  min-width: 0;
}

.note-detail-page__sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.note-detail-page__viewer,
.note-detail-page__panel,
.note-detail-page__empty {
  padding: 24px;
}

.note-detail-page__viewer-head,
.note-detail-page__panel-head {
  justify-content: space-between;
  margin-bottom: 18px;
}

.note-detail-page__panel-head span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.note-detail-page__view-switcher {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.note-detail-page__view-button {
  padding: 10px 16px;
  border: 1px solid var(--border-light);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.16s ease;
}

.note-detail-page__view-button:hover,
.note-detail-page__view-button--active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
}

.note-detail-page__content {
  min-height: 340px;
  color: var(--text-primary);
  line-height: 1.82;
}

.note-detail-page__content :deep(h1),
.note-detail-page__content :deep(h2),
.note-detail-page__content :deep(h3),
.note-detail-page__content :deep(p) {
  margin-top: 0;
}

.note-detail-page__content :deep(blockquote) {
  margin: 0 0 18px;
  padding: 14px 18px;
  border-left: 4px solid var(--brand-blue);
  border-radius: 16px;
  background: rgba(14, 165, 233, 0.08);
}

.note-detail-page__content :deep(pre) {
  overflow-x: auto;
  padding: 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.94);
}

.note-detail-page__meta-list {
  display: grid;
  gap: 14px;
  margin: 0;
}

.note-detail-page__meta-list dt {
  margin-bottom: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.note-detail-page__meta-list dd {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.7;
}

.note-detail-page__quick-actions {
  display: grid;
  gap: 12px;
}

.note-detail-page__quick-button {
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.note-detail-page__quick-button strong,
.note-detail-page__quick-button span {
  display: block;
}

.note-detail-page__quick-button span {
  margin-top: 6px;
  color: var(--text-secondary);
  line-height: 1.65;
}

.note-detail-page__quick-button:hover {
  transform: translateY(-2px);
  border-color: var(--brand-blue-border);
  box-shadow: var(--shadow-elevated);
}

.note-detail-page__empty {
  text-align: center;
  color: var(--text-secondary);
}

@media (max-width: 1080px) {
  .note-detail-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .note-detail-page__hero,
  .note-detail-page__hero-actions,
  .note-detail-page__viewer-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .note-detail-page__view-switcher {
    justify-content: flex-start;
  }
}
</style>
