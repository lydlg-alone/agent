<template>
  <section class="study-session">
    <header class="study-session__header">
      <div>
        <h2>间隔重复复习</h2>
        <p>学习集：{{ studySetTitle }}</p>
      </div>
      <div class="study-session__actions">
        <el-button @click="goFlashcards">返回闪卡管理</el-button>
        <el-button @click="reloadDueCards">刷新到期卡片</el-button>
      </div>
    </header>

    <div v-if="loading" class="study-session__loading">
      正在加载到期卡片...
    </div>

    <div v-else-if="!cards.length && !sessionCompleted" class="study-session__empty">
      <h3>当前没有到期卡片</h3>
      <p>可先去闪卡管理页创建内容，或稍后再来复习。</p>
    </div>

    <template v-else-if="activeCard">
      <div class="study-session__progress">
        <div>进度：{{ currentIndex + 1 }} / {{ cards.length }}</div>
        <div>已完成：{{ reviewedCount }} 张</div>
      </div>

      <article class="study-card">
        <header class="study-card__meta">
          <span>类型：{{ cardTypeLabel(activeCard.cardType) }}</span>
          <span>下次到期：{{ formatDateTime(activeCard.dueAt) }}</span>
        </header>

        <section class="study-card__content">
          <template v-if="activeCard.cardType === 'cloze'">
            <ClozeRenderer
              :front-text="activeCard.frontText"
              :template-text="activeCard.extraData?.templateText || ''"
              :revealed="revealed"
            />
          </template>

          <template v-else-if="activeCard.cardType === 'image_occlusion'">
            <ImageOcclusionViewer
              :front-text="activeCard.frontText"
              :image-data-url="activeCard.extraData?.imageDataUrl || ''"
              :masks="activeCard.extraData?.masks || []"
              :revealed="revealed"
            />
          </template>

          <template v-else>
            <div class="study-card__standard">
              <div class="study-card__block">
                <h4>正面</h4>
                <p>{{ activeCard.frontText }}</p>
              </div>

              <div class="study-card__block">
                <h4>背面</h4>
                <p v-if="revealed">{{ activeCard.backText }}</p>
                <p v-else class="masked">点击“显示答案”后可见</p>
              </div>
            </div>
          </template>
        </section>

        <footer class="study-card__footer">
          <el-button v-if="!revealed" type="primary" @click="revealed = true">显示答案</el-button>
          <template v-else>
            <span class="study-card__hint">自评 1-5（1 最差，5 最好）</span>
            <div class="quality-buttons">
              <el-button v-for="score in [1, 2, 3, 4, 5]" :key="score" :loading="submitting" @click="submitReview(score)">
                {{ score }}
              </el-button>
            </div>
          </template>
        </footer>
      </article>
    </template>

    <div v-if="sessionCompleted" class="study-session__complete">
      <h3>本轮复习完成</h3>
      <p>正确率（评分 >= 3）：{{ accuracyText }}</p>
      <el-button type="primary" @click="reloadDueCards">重新加载到期卡片</el-button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import ClozeRenderer from "@/components/flashcards/ClozeRenderer.vue";
import ImageOcclusionViewer from "@/components/flashcards/ImageOcclusionViewer.vue";
import { useFlashcardsStore } from "@/stores/flashcards.js";
import { useStudySetsStore } from "@/stores/studySets.js";

const route = useRoute();
const router = useRouter();
const flashcardsStore = useFlashcardsStore();
const studySetsStore = useStudySetsStore();

const studySetId = computed(() => String(route.params.id || ""));
const loading = ref(false);
const submitting = ref(false);
const cards = ref([]);
const reviewedCount = ref(0);
const passCount = ref(0);
const currentIndex = ref(0);
const revealed = ref(false);
const sessionCompleted = ref(false);

const activeCard = computed(() => cards.value[currentIndex.value] || null);
const studySetTitle = computed(() => {
  const target = studySetsStore.items.find((item) => item.id === studySetId.value);
  return target?.title || studySetId.value;
});
const accuracyText = computed(() => {
  if (!reviewedCount.value) {
    return "0%";
  }
  const pct = (passCount.value / reviewedCount.value) * 100;
  return `${pct.toFixed(0)}%`;
});

function cardTypeLabel(cardType) {
  if (cardType === "cloze") {
    return "完形填空";
  }
  if (cardType === "image_occlusion") {
    return "图片遮挡";
  }
  return "标准卡";
}

async function ensureStudySetLoaded() {
  if (!studySetsStore.items.length) {
    await studySetsStore.fetchStudySets();
  }
}

async function reloadDueCards() {
  loading.value = true;
  sessionCompleted.value = false;
  reviewedCount.value = 0;
  passCount.value = 0;
  currentIndex.value = 0;
  revealed.value = false;
  try {
    cards.value = await flashcardsStore.fetchFlashcards(studySetId.value, {
      dueOnly: "true",
      limit: 200
    });
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "加载到期闪卡失败");
  } finally {
    loading.value = false;
  }
}

async function submitReview(quality) {
  if (!activeCard.value) {
    return;
  }

  submitting.value = true;
  try {
    await flashcardsStore.reviewFlashcard(activeCard.value.id, quality);
    reviewedCount.value += 1;
    if (quality >= 3) {
      passCount.value += 1;
    }

    const nextIndex = currentIndex.value + 1;
    if (nextIndex >= cards.value.length) {
      sessionCompleted.value = true;
      cards.value = [];
      return;
    }

    currentIndex.value = nextIndex;
    revealed.value = false;
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "提交复习评分失败");
  } finally {
    submitting.value = false;
  }
}

function goFlashcards() {
  router.push({ name: "study-set-flashcards", params: { id: studySetId.value } });
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
  await reloadDueCards();
});
</script>

<style scoped>
.study-session {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.study-session__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.study-session__header h2 {
  margin: 0;
}

.study-session__header p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.study-session__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.study-session__loading,
.study-session__empty,
.study-session__complete {
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  background: var(--bg-overlay-strong);
  padding: 22px;
}

.study-session__empty h3,
.study-session__complete h3 {
  margin: 0;
}

.study-session__empty p,
.study-session__complete p {
  margin: 10px 0 0;
  color: var(--text-secondary);
}

.study-session__progress {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 14px;
}

.study-card {
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  background: var(--bg-overlay-strong);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.study-card__meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 13px;
}

.study-card__standard {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.study-card__block h4 {
  margin: 0 0 8px;
}

.study-card__block p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.65;
}

.study-card__block .masked {
  color: var(--text-tertiary);
}

.study-card__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.study-card__hint {
  color: var(--text-secondary);
  font-size: 13px;
}

.quality-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 1100px) {
  .study-session__header {
    flex-direction: column;
  }

  .study-session__progress,
  .study-card__meta {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
