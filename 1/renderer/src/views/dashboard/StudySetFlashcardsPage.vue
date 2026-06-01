<template>
  <section class="flashcards-page">
    <header class="flashcards-page__header">
      <div>
        <h2>闪卡管理</h2>
        <p>学习集：{{ studySetTitle }}</p>
      </div>

      <div class="flashcards-page__actions">
        <el-button @click="goBack">返回学习集列表</el-button>
        <el-button type="success" @click="goStudy">开始复习</el-button>
        <el-button type="primary" @click="openCreateDialog">新建闪卡</el-button>
      </div>
    </header>

    <el-table v-loading="loading" :data="items" stripe>
      <el-table-column label="类型" width="130">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ cardTypeLabel(row.cardType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="内容预览" min-width="340">
        <template #default="{ row }">
          <div class="flashcards-page__preview">
            <strong>{{ row.frontText || "无提示" }}</strong>
            <p>{{ cardPreview(row) }}</p>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="到期时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.dueAt) }}</template>
      </el-table-column>
      <el-table-column label="标签" min-width="180">
        <template #default="{ row }">
          <div class="tag-list">
            <el-tag v-for="tag in row.tags || []" :key="`${row.id}-${tag}`" size="small" effect="plain">
              {{ tag }}
            </el-tag>
            <span v-if="!(row.tags || []).length" class="muted">-</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button text @click="openEditDialog(row)">编辑</el-button>
          <el-button text type="danger" @click="removeFlashcard(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新建闪卡' : '编辑闪卡'" width="760px">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-select v-model="dialog.form.cardType">
            <el-option label="标准卡" value="standard" />
            <el-option label="完形填空" value="cloze" />
            <el-option label="图片遮挡" value="image_occlusion" />
          </el-select>
        </el-form-item>

        <template v-if="dialog.form.cardType === 'standard'">
          <el-form-item label="正面内容">
            <el-input v-model="dialog.form.frontText" type="textarea" :rows="5" maxlength="20000" />
          </el-form-item>
          <el-form-item label="背面内容">
            <el-input v-model="dialog.form.backText" type="textarea" :rows="5" maxlength="20000" />
          </el-form-item>
        </template>

        <template v-else-if="dialog.form.cardType === 'cloze'">
          <ClozeEditor v-model="dialog.clozeDraft" />
        </template>

        <template v-else>
          <ImageOcclusionEditor v-model="dialog.imageDraft" />
        </template>

        <el-form-item label="标签（逗号分隔）">
          <el-input v-model="dialog.tagsText" placeholder="例如：定义, 高频" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="submitDialog">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import ClozeEditor from "@/components/flashcards/ClozeEditor.vue";
import ImageOcclusionEditor from "@/components/flashcards/ImageOcclusionEditor.vue";
import { useFlashcardsStore } from "@/stores/flashcards.js";
import { useStudySetsStore } from "@/stores/studySets.js";

const route = useRoute();
const router = useRouter();
const flashcardsStore = useFlashcardsStore();
const studySetsStore = useStudySetsStore();
const { items, loading } = storeToRefs(flashcardsStore);

const studySetId = computed(() => String(route.params.id || ""));

const dialog = reactive({
  visible: false,
  mode: "create",
  saving: false,
  editId: "",
  tagsText: "",
  form: {
    cardType: "standard",
    frontText: "",
    backText: ""
  },
  clozeDraft: {
    frontText: "",
    templateText: ""
  },
  imageDraft: {
    frontText: "",
    imageDataUrl: "",
    masks: []
  }
});

const studySetTitle = computed(() => {
  const target = studySetsStore.items.find((item) => item.id === studySetId.value);
  return target?.title || studySetId.value;
});

const normalizedTags = computed(() =>
  dialog.tagsText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
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

function cardPreview(card) {
  if (card.cardType === "cloze") {
    return (card.extraData?.templateText || "").replace(/\{\{(.*?)\}\}/g, "____").slice(0, 120) || "无模板";
  }
  if (card.cardType === "image_occlusion") {
    return `${(card.extraData?.masks || []).length} 个遮挡区`;
  }
  return (card.backText || "").slice(0, 120) || "无背面内容";
}

function resetDialog() {
  dialog.editId = "";
  dialog.tagsText = "";
  dialog.form.cardType = "standard";
  dialog.form.frontText = "";
  dialog.form.backText = "";
  dialog.clozeDraft = {
    frontText: "",
    templateText: ""
  };
  dialog.imageDraft = {
    frontText: "",
    imageDataUrl: "",
    masks: []
  };
}

function mapDialogPayload() {
  if (dialog.form.cardType === "cloze") {
    const templateText = dialog.clozeDraft.templateText.trim();
    const answers = [...templateText.matchAll(/\{\{(.*?)\}\}/g)]
      .map((match) => String(match[1] || "").trim())
      .filter(Boolean);

    return {
      cardType: "cloze",
      frontText: dialog.clozeDraft.frontText.trim(),
      backText: answers.join(" / ") || "Cloze answers",
      extraData: {
        templateText,
        answers
      },
      tags: normalizedTags.value
    };
  }

  if (dialog.form.cardType === "image_occlusion") {
    const masks = (dialog.imageDraft.masks || [])
      .map((mask, index) => ({
        id: String(mask.id || `mask-${index + 1}`),
        x: Number(mask.x || 0),
        y: Number(mask.y || 0),
        width: Number(mask.width || 0),
        height: Number(mask.height || 0),
        label: String(mask.label || "").trim()
      }))
      .filter((mask) => mask.width > 0 && mask.height > 0);

    return {
      cardType: "image_occlusion",
      frontText: dialog.imageDraft.frontText.trim(),
      backText: masks.map((mask) => mask.label || "遮挡区").join(" / ") || "Image occlusion answers",
      extraData: {
        imageDataUrl: dialog.imageDraft.imageDataUrl,
        masks
      },
      tags: normalizedTags.value
    };
  }

  return {
    cardType: "standard",
    frontText: dialog.form.frontText.trim(),
    backText: dialog.form.backText.trim(),
    extraData: {},
    tags: normalizedTags.value
  };
}

async function loadFlashcards() {
  await flashcardsStore.fetchFlashcards(studySetId.value);
}

async function ensureStudySetLoaded() {
  if (!studySetId.value) {
    return;
  }
  if (!studySetsStore.items.length) {
    await studySetsStore.fetchStudySets();
  }
}

function openCreateDialog() {
  dialog.mode = "create";
  dialog.visible = true;
  resetDialog();
}

function openEditDialog(card) {
  dialog.mode = "edit";
  dialog.visible = true;
  dialog.editId = card.id;
  dialog.form.cardType = card.cardType || "standard";
  dialog.form.frontText = card.frontText || "";
  dialog.form.backText = card.backText || "";
  dialog.tagsText = (card.tags || []).join(", ");
  dialog.clozeDraft = {
    frontText: card.frontText || "",
    templateText: card.extraData?.templateText || ""
  };
  dialog.imageDraft = {
    frontText: card.frontText || "",
    imageDataUrl: card.extraData?.imageDataUrl || "",
    masks: structuredClone(card.extraData?.masks || [])
  };
}

async function submitDialog() {
  const payload = mapDialogPayload();

  if (payload.cardType === "standard" && (!payload.frontText || !payload.backText)) {
    ElMessage.warning("标准卡的正面和背面内容不能为空");
    return;
  }

  if (payload.cardType === "cloze" && !payload.extraData.templateText) {
    ElMessage.warning("完形填空模板不能为空");
    return;
  }

  if (payload.cardType === "image_occlusion") {
    if (!payload.extraData.imageDataUrl) {
      ElMessage.warning("请先上传图片");
      return;
    }
    if (!payload.extraData.masks.length) {
      ElMessage.warning("请至少绘制一个遮挡区");
      return;
    }
  }

  dialog.saving = true;
  try {
    if (dialog.mode === "create") {
      await flashcardsStore.createFlashcard(studySetId.value, payload);
      ElMessage.success("闪卡已创建");
    } else {
      await flashcardsStore.updateFlashcard(dialog.editId, payload);
      ElMessage.success("闪卡已更新");
    }
    dialog.visible = false;
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "保存闪卡失败");
  } finally {
    dialog.saving = false;
  }
}

async function removeFlashcard(cardId) {
  try {
    await ElMessageBox.confirm("确认删除该闪卡吗？", "删除确认", { type: "warning" });
    await flashcardsStore.deleteFlashcard(cardId);
    ElMessage.success("闪卡已删除");
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error?.response?.data?.message || error?.message || "删除失败");
    }
  }
}

function goBack() {
  router.push({ name: "study-sets" });
}

function goStudy() {
  router.push({ name: "study-session", params: { id: studySetId.value } });
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

onMounted(async () => {
  await ensureStudySetLoaded();
  await loadFlashcards();
});
</script>

<style scoped>
.flashcards-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.flashcards-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.flashcards-page__header h2 {
  margin: 0;
}

.flashcards-page__header p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.flashcards-page__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.flashcards-page__preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flashcards-page__preview strong,
.flashcards-page__preview p {
  margin: 0;
  white-space: pre-wrap;
}

.flashcards-page__preview p {
  color: var(--text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.muted {
  color: var(--text-tertiary);
}

@media (max-width: 1100px) {
  .flashcards-page__header {
    flex-direction: column;
  }
}
</style>
