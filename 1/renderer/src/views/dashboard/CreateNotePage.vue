<template>
  <section class="note-editor-page">
    <header class="note-editor-page__hero">
      <div class="note-editor-page__hero-copy">
        <button type="button" class="note-editor-page__back" @click="goBack">返回笔记中心</button>
        <h2>创建笔记</h2>
        <p>参考 `studyield-main` 的工作台布局，但沿用当前项目的冰川蓝玻璃风格。支持 Markdown、格式快捷插入和实时预览。</p>
      </div>
      <div class="note-editor-page__hero-actions">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存笔记</el-button>
      </div>
    </header>

    <div class="note-editor-page__layout">
      <section class="note-editor-page__editor surface-card">
        <label class="note-editor-page__title-field">
          <span>标题</span>
          <input v-model="form.title" type="text" maxlength="160" placeholder="例如：JavaScript 异步编程核心笔记" />
        </label>

        <div class="note-editor-page__toolbar">
          <button
            v-for="action in NOTE_FORMAT_ACTIONS"
            :key="action.key"
            type="button"
            class="note-editor-page__tool"
            :title="action.hint"
            @click="insertFormat(action.key)"
          >
            {{ action.label }}
          </button>
          <div class="note-editor-page__toolbar-hint">支持 Markdown，点击快捷按钮可插入常用格式。</div>
        </div>

        <textarea
          ref="contentTextareaRef"
          v-model="form.content"
          class="note-editor-page__textarea"
          maxlength="50000"
          placeholder="# 主题&#10;&#10;- 关键概念&#10;- 易错点&#10;- 记忆方法"
        />

        <footer class="note-editor-page__editor-foot">
          <span>{{ contentLength }} / 50000 字符</span>
          <span>{{ estimatedReadingMinutes }} 分钟阅读</span>
        </footer>
      </section>

      <aside class="note-editor-page__sidebar">
        <section class="surface-card note-editor-page__panel">
          <h3>笔记设置</h3>

          <el-form label-position="top">
            <el-form-item label="所属学习集">
              <el-select v-model="form.studySetId" placeholder="请选择学习集">
                <el-option
                  v-for="studySet in studySets"
                  :key="studySet.id"
                  :label="studySet.title"
                  :value="studySet.id"
                />
              </el-select>
            </el-form-item>

            <div class="note-editor-page__field-grid">
              <el-form-item label="颜色标记">
                <el-select v-model="form.colorToken">
                  <el-option label="琥珀" value="amber" />
                  <el-option label="天蓝" value="sky" />
                  <el-option label="翡翠" value="emerald" />
                  <el-option label="玫瑰" value="rose" />
                </el-select>
              </el-form-item>

              <el-form-item label="来源类型">
                <el-select v-model="form.sourceType">
                  <el-option label="手动" value="manual" />
                  <el-option label="PDF" value="pdf" />
                  <el-option label="网站" value="website" />
                  <el-option label="YouTube" value="youtube" />
                  <el-option label="音频" value="audio" />
                  <el-option label="手写" value="handwriting" />
                </el-select>
              </el-form-item>
            </div>

            <el-form-item label="来源文档 ID（可选）">
              <el-input v-model="form.sourceDocumentId" maxlength="80" placeholder="关联知识文档时填写" />
            </el-form-item>

            <el-form-item label="置顶">
              <el-switch v-model="form.isPinned" inline-prompt active-text="是" inactive-text="否" />
            </el-form-item>
          </el-form>
        </section>

        <section class="surface-card note-editor-page__panel">
          <div class="note-editor-page__panel-head">
            <h3>预览</h3>
            <span>{{ previewLabel }}</span>
          </div>
          <article class="note-editor-page__preview prose" v-html="previewHtml"></article>
        </section>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { useNotesStore } from "@/stores/notes.js";
import { useStudySetsStore } from "@/stores/studySets.js";
import { renderMarkdown } from "@/utils/markdownRenderer.js";
import { NOTE_FORMAT_ACTIONS, applyFormatting } from "@/utils/noteEditor.js";

const route = useRoute();
const router = useRouter();
const notesStore = useNotesStore();
const studySetsStore = useStudySetsStore();
const { items: studySets } = storeToRefs(studySetsStore);

const saving = ref(false);
const contentTextareaRef = ref(null);
const form = reactive({
  studySetId: "",
  title: "",
  content: "",
  colorToken: "amber",
  isPinned: false,
  sourceType: "manual",
  sourceDocumentId: ""
});

const contentLength = computed(() => form.content.length);
const estimatedReadingMinutes = computed(() => Math.max(1, Math.ceil(contentLength.value / 320)));
const previewLabel = computed(() => (form.title.trim() ? "实时预览" : "填写标题后预览更完整"));
const previewHtml = computed(() => {
  const content = form.content.trim() || "在左侧输入正文后，这里会展示渲染结果。";
  return renderMarkdown(`# ${form.title.trim() || "未命名笔记"}\n\n${content}`);
});

function initialStudySetId() {
  return String(route.params.id || route.query.studySetId || "");
}

function goBack() {
  router.push({ name: "notes" });
}

function insertFormat(actionKey) {
  const textarea = contentTextareaRef.value;
  if (!textarea) {
    return;
  }

  const result = applyFormatting(form.content, textarea.selectionStart, textarea.selectionEnd, actionKey);
  form.content = result.value;

  nextTick(() => {
    textarea.focus();
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  });
}

async function submit() {
  if (!form.studySetId) {
    ElMessage.warning("请选择学习集");
    return;
  }
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning("标题和内容不能为空");
    return;
  }

  saving.value = true;
  try {
    const note = await notesStore.createNote(form.studySetId, {
      title: form.title.trim(),
      content: form.content.trim(),
      colorToken: form.colorToken,
      isPinned: form.isPinned,
      sourceType: form.sourceType,
      sourceDocumentId: form.sourceDocumentId.trim()
    });
    ElMessage.success("笔记已创建");
    router.replace({ name: "note-detail", params: { noteId: note.id } });
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "创建笔记失败");
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (!studySets.value.length) {
    await studySetsStore.fetchStudySets();
  }

  form.studySetId = initialStudySetId() || studySets.value[0]?.id || "";
});
</script>

<style scoped>
.note-editor-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.note-editor-page__hero,
.note-editor-page__hero-actions,
.note-editor-page__panel-head,
.note-editor-page__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-editor-page__hero {
  justify-content: space-between;
  padding: 28px;
  border-radius: 30px;
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(236, 248, 255, 0.88));
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
}

.note-editor-page__hero-copy h2,
.note-editor-page__panel h3 {
  margin: 0;
}

.note-editor-page__hero-copy p {
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.note-editor-page__back {
  margin-bottom: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--brand-blue);
  font: inherit;
  cursor: pointer;
}

.note-editor-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
  gap: 20px;
}

.surface-card {
  border-radius: 30px;
  border: 1px solid var(--border-light);
  background: var(--bg-overlay-strong);
  box-shadow: var(--shadow-card);
}

.note-editor-page__editor,
.note-editor-page__panel {
  padding: 22px;
}

.note-editor-page__title-field {
  display: block;
  margin-bottom: 18px;
}

.note-editor-page__title-field span {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.note-editor-page__title-field input {
  width: 100%;
  padding: 0 0 12px;
  border: 0;
  border-bottom: 2px solid var(--border-light);
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 28px;
  font-weight: 800;
  outline: none;
}

.note-editor-page__title-field input:focus {
  border-bottom-color: var(--brand-blue);
}

.note-editor-page__toolbar {
  flex-wrap: wrap;
  padding: 12px;
  border-radius: 20px;
  background: rgba(232, 246, 255, 0.72);
  border: 1px solid rgba(158, 212, 240, 0.72);
}

.note-editor-page__tool {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--text-primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease;
}

.note-editor-page__tool:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.95);
}

.note-editor-page__toolbar-hint {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 12px;
}

.note-editor-page__textarea {
  width: 100%;
  min-height: 520px;
  margin-top: 16px;
  padding: 18px;
  resize: vertical;
  border: 1px solid var(--border-light);
  border-radius: 22px;
  background: rgba(248, 252, 255, 0.92);
  color: var(--text-primary);
  font: inherit;
  line-height: 1.8;
  outline: none;
}

.note-editor-page__textarea:focus {
  border-color: var(--brand-blue);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
}

.note-editor-page__editor-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.note-editor-page__sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.note-editor-page__panel-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.note-editor-page__panel-head span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.note-editor-page__field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.note-editor-page__preview {
  min-height: 240px;
  padding: 18px;
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.1), transparent 30%),
    rgba(248, 252, 255, 0.94);
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  line-height: 1.75;
}

.note-editor-page__preview :deep(h1),
.note-editor-page__preview :deep(h2),
.note-editor-page__preview :deep(h3) {
  margin-top: 0;
}

.note-editor-page__preview :deep(pre) {
  overflow-x: auto;
  padding: 14px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.9);
}

@media (max-width: 1080px) {
  .note-editor-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .note-editor-page__hero,
  .note-editor-page__hero-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .note-editor-page__field-grid {
    grid-template-columns: 1fr;
  }

  .note-editor-page__toolbar-hint {
    width: 100%;
    margin-left: 0;
  }
}
</style>
