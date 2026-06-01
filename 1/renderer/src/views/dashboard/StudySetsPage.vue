<template>
  <section class="study-sets-page">
    <header class="study-sets-page__header">
      <div>
        <h2>学习集</h2>
      </div>

      <div class="study-sets-page__header-actions">
        <el-input
          v-model="searchText"
          clearable
          placeholder="搜索标题、描述、标签"
          class="study-sets-page__search"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button @click="handleSearch">搜索</el-button>
        <el-button type="primary" @click="openCreateDialog">新建学习集</el-button>
      </div>
    </header>

    <el-table v-loading="loading" :data="items" stripe>
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="examSubject" label="考试科目" min-width="120" />
      <el-table-column label="标签" min-width="220">
        <template #default="{ row }">
          <div class="tag-list">
            <el-tag v-for="tag in row.tags || []" :key="`${row.id}-${tag}`" size="small" effect="plain">
              {{ tag }}
            </el-tag>
            <span v-if="!(row.tags || []).length" class="muted">-</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="公开" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.isPublic ? 'success' : 'info'">
            {{ row.isPublic ? "是" : "否" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="580" fixed="right">
        <template #default="{ row }">
          <el-button text @click="goFlashcards(row.id)">闪卡</el-button>
          <el-button text type="success" @click="goStudy(row.id)">复习</el-button>
          <el-button text type="warning" @click="goQuiz(row.id)">测验</el-button>
          <el-button
            text
            type="primary"
            :loading="importingStudySetId === row.id"
            @click="triggerDocumentImport(row.id)"
          >
            导入文档
          </el-button>
          <el-button text @click="viewDetail(row.id)">查看</el-button>
          <el-button text @click="openEditDialog(row)">编辑</el-button>
          <el-button text type="danger" @click="removeStudySet(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新建学习集' : '编辑学习集'" width="640px">
      <el-form label-position="top" :model="dialog.form">
        <el-form-item label="标题">
          <el-input v-model="dialog.form.title" maxlength="120" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="dialog.form.description" type="textarea" :rows="4" maxlength="4000" />
        </el-form-item>
        <el-form-item label="标签（逗号分隔）">
          <el-input v-model="dialog.tagsText" placeholder="例如：数学, 期末, 重点" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="考试科目">
              <el-input v-model="dialog.form.examSubject" maxlength="120" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="考试日期">
              <el-input v-model="dialog.form.examDate" placeholder="YYYY-MM-DD" maxlength="30" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="公开">
          <el-switch v-model="dialog.form.isPublic" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="submitDialog">
          保存
        </el-button>
      </template>
    </el-dialog>

    <input ref="documentFileInputRef" type="file" class="hidden-file-input" multiple @change="handleDocumentFileChange" />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { createStudySetDocument } from "@/services/api.js";
import { useStudySetsStore } from "@/stores/studySets.js";
import { readFileAsBase64, readFileAsText, shouldReadAsText } from "@/utils/workspaceFormatters.js";

const router = useRouter();
const store = useStudySetsStore();
const { items, loading } = storeToRefs(store);

const searchText = ref("");
const importingStudySetId = ref("");
const pendingImportStudySetId = ref("");
const documentFileInputRef = ref(null);

const dialog = reactive({
  visible: false,
  mode: "create",
  saving: false,
  editId: "",
  tagsText: "",
  form: {
    title: "",
    description: "",
    examDate: "",
    examSubject: "",
    isPublic: false
  }
});

const normalizedTags = computed(() =>
  dialog.tagsText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);

function resetDialogForm() {
  dialog.form.title = "";
  dialog.form.description = "";
  dialog.form.examDate = "";
  dialog.form.examSubject = "";
  dialog.form.isPublic = false;
  dialog.tagsText = "";
  dialog.editId = "";
}

function mapPayload() {
  return {
    title: dialog.form.title.trim(),
    description: dialog.form.description.trim(),
    tags: normalizedTags.value,
    isPublic: dialog.form.isPublic,
    examDate: dialog.form.examDate.trim(),
    examSubject: dialog.form.examSubject.trim()
  };
}

async function loadStudySets() {
  await store.fetchStudySets({ search: searchText.value.trim() });
}

function openCreateDialog() {
  dialog.mode = "create";
  dialog.visible = true;
  resetDialogForm();
}

function openEditDialog(row) {
  dialog.mode = "edit";
  dialog.visible = true;
  dialog.editId = row.id;
  dialog.form.title = row.title || "";
  dialog.form.description = row.description || "";
  dialog.form.examDate = row.examDate || "";
  dialog.form.examSubject = row.examSubject || "";
  dialog.form.isPublic = Boolean(row.isPublic);
  dialog.tagsText = (row.tags || []).join(", ");
}

async function submitDialog() {
  const payload = mapPayload();
  if (!payload.title) {
    ElMessage.warning("标题不能为空");
    return;
  }

  dialog.saving = true;
  try {
    if (dialog.mode === "create") {
      await store.createStudySet(payload);
      ElMessage.success("学习集已创建");
    } else {
      await store.updateStudySet(dialog.editId, payload);
      ElMessage.success("学习集已更新");
    }
    dialog.visible = false;
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "保存失败");
  } finally {
    dialog.saving = false;
  }
}

async function removeStudySet(row) {
  try {
    await ElMessageBox.confirm(`确认删除学习集「${row.title}」吗？`, "删除确认", {
      type: "warning"
    });
    await store.deleteStudySet(row.id);
    ElMessage.success("学习集已删除");
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error?.response?.data?.message || error?.message || "删除失败");
    }
  }
}

function viewDetail(id) {
  router.push({ name: "study-set-detail", params: { id } });
}

function goFlashcards(id) {
  router.push({ name: "study-set-flashcards", params: { id } });
}

function goStudy(id) {
  router.push({ name: "study-session", params: { id } });
}

function goQuiz(id) {
  router.push({ name: "study-set-quiz", params: { id } });
}

function handleSearch() {
  loadStudySets();
}

function triggerDocumentImport(studySetId) {
  pendingImportStudySetId.value = studySetId;
  documentFileInputRef.value?.click();
}

async function handleDocumentFileChange(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";

  if (!files.length || !pendingImportStudySetId.value) {
    return;
  }

  importingStudySetId.value = pendingImportStudySetId.value;

  try {
    for (const file of files) {
      const contentText = shouldReadAsText(file) ? await readFileAsText(file) : await readFileAsBase64(file);
      await createStudySetDocument(pendingImportStudySetId.value, {
        name: file.name,
        sourceType: "upload",
        mimeType: file.type || "application/octet-stream",
        contentText
      });
    }

    ElMessage.success(`已向学习集导入 ${files.length} 份文档`);
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "导入文档失败");
  } finally {
    importingStudySetId.value = "";
    pendingImportStudySetId.value = "";
  }
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

onMounted(loadStudySets);
</script>

<style scoped>
.study-sets-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.study-sets-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.study-sets-page__header h2 {
  margin: 0;
}

.study-sets-page__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.study-sets-page__search {
  width: 240px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.muted {
  color: var(--text-tertiary);
}

.hidden-file-input {
  display: none;
}

@media (max-width: 1100px) {
  .study-sets-page__header {
    flex-direction: column;
  }

  .study-sets-page__header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
