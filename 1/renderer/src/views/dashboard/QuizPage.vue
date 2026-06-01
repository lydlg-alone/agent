<template>
  <section class="quiz-page">
    <header class="quiz-page__header">
      <div>
        <h2>测验模块</h2>
        <p>学习集：{{ studySetTitle }}</p>
      </div>
      <div class="quiz-page__header-actions">
        <el-button @click="goFlashcards">闪卡管理</el-button>
        <el-button @click="goStudy">复习会话</el-button>
      </div>
    </header>

    <div class="quiz-page__layout">
      <aside class="quiz-page__sidebar">
        <section class="quiz-page__panel">
          <h3>生成新测验</h3>
          <el-form label-position="top" :model="generatorForm">
            <el-form-item label="测验标题">
              <el-input v-model="generatorForm.title" maxlength="160" placeholder="默认自动生成" />
            </el-form-item>
            <el-form-item label="题目数量">
              <el-input-number v-model="generatorForm.questionCount" :min="1" :max="50" />
            </el-form-item>
            <el-form-item label="题型">
              <el-checkbox-group v-model="generatorForm.questionTypes">
                <el-checkbox label="mcq">单选</el-checkbox>
                <el-checkbox label="true_false">判断</el-checkbox>
                <el-checkbox label="fill_blank">填空</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleGenerateQuiz">生成测验</el-button>
          </el-form>
        </section>

        <section class="quiz-page__panel">
          <div class="quiz-page__panel-head">
            <h3>历史测验</h3>
            <el-button text @click="loadQuizzes">刷新</el-button>
          </div>

          <div v-if="loading && !items.length" class="quiz-page__empty">正在加载测验...</div>
          <div v-else-if="!items.length" class="quiz-page__empty">当前还没有测验记录。</div>

          <div v-else class="quiz-page__quiz-list">
            <button
              v-for="quiz in items"
              :key="quiz.id"
              type="button"
              class="quiz-page__quiz-item"
              :class="{ 'quiz-page__quiz-item--active': quiz.id === activeQuiz?.id }"
              @click="selectQuiz(quiz.id)"
            >
              <strong>{{ quiz.title }}</strong>
              <span>{{ quiz.questionCount }} 题 · {{ quiz.attemptCount }} 次作答</span>
              <span>{{ formatDateTime(quiz.updatedAt) }}</span>
            </button>
          </div>
        </section>
      </aside>

      <main class="quiz-page__main">
        <section v-if="activeQuiz" class="quiz-page__panel">
          <div class="quiz-page__panel-head">
            <div>
              <h3>{{ activeQuiz.title }}</h3>
              <p>{{ activeQuiz.questionCount }} 题 · {{ activeQuiz.questionTypes.join(" / ") }}</p>
            </div>
            <div class="quiz-page__panel-actions">
              <el-button :loading="loading" @click="reloadAttempts">刷新作答历史</el-button>
              <el-button @click="restartQuiz">重新作答</el-button>
              <el-button :disabled="!latestAttempt" :loading="submitting" type="warning" @click="retryWrongOnly">
                错题再测
              </el-button>
            </div>
          </div>

          <div class="quiz-page__question-list">
            <article v-for="(question, index) in activeQuiz.questions" :key="question.id" class="quiz-page__question">
              <header class="quiz-page__question-head">
                <strong>第 {{ index + 1 }} 题</strong>
                <span>{{ questionTypeLabel(question.questionType) }}</span>
              </header>

              <ImageOcclusionViewer
                v-if="question.asset?.type === 'image_occlusion'"
                :front-text="'请结合图片遮挡区域作答'"
                :image-data-url="question.asset.imageDataUrl || ''"
                :masks="question.asset.masks || []"
                :revealed="false"
              />

              <p class="quiz-page__prompt">{{ question.promptText }}</p>

              <el-radio-group
                v-if="question.questionType === 'mcq'"
                v-model="answers[question.id].optionId"
                class="quiz-page__options"
              >
                <el-radio v-for="option in question.options" :key="option.id" :label="option.id">
                  {{ option.text }}
                </el-radio>
              </el-radio-group>

              <el-radio-group
                v-else-if="question.questionType === 'true_false'"
                v-model="answers[question.id].value"
                class="quiz-page__options"
              >
                <el-radio :label="true">正确</el-radio>
                <el-radio :label="false">错误</el-radio>
              </el-radio-group>

              <el-input
                v-else
                v-model="answers[question.id].text"
                type="textarea"
                :rows="2"
                maxlength="500"
                placeholder="请输入答案"
              />
            </article>
          </div>

          <div class="quiz-page__submit">
            <el-button type="primary" :loading="submitting" @click="handleSubmitAttempt">提交测验</el-button>
          </div>
        </section>

        <section v-else class="quiz-page__panel quiz-page__empty">
          先生成一个测验，或从左侧选择历史测验。
        </section>

        <QuizResultPanel v-if="latestAttempt" :attempt="latestAttempt" />

        <section v-if="activeQuiz" class="quiz-page__panel">
          <div class="quiz-page__panel-head">
            <h3>作答历史</h3>
          </div>

          <div v-if="!attempts.length" class="quiz-page__empty">当前测验还没有作答记录。</div>

          <div v-else class="quiz-page__attempt-list">
            <article v-for="attempt in attempts" :key="attempt.id" class="quiz-page__attempt-item">
              <div>
                <strong>{{ Number(attempt.score || 0).toFixed(0) }} 分</strong>
                <p>{{ attempt.correctCount }} / {{ attempt.totalCount }} · {{ formatDateTime(attempt.submittedAt) }}</p>
              </div>
              <el-button text @click="latestAttempt = attempt">查看结果</el-button>
            </article>
          </div>
        </section>
      </main>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import ImageOcclusionViewer from "@/components/flashcards/ImageOcclusionViewer.vue";
import QuizResultPanel from "@/components/quiz/QuizResultPanel.vue";
import { useQuizzesStore } from "@/stores/quizzes.js";
import { useStudySetsStore } from "@/stores/studySets.js";

const route = useRoute();
const router = useRouter();
const quizzesStore = useQuizzesStore();
const studySetsStore = useStudySetsStore();

const { items, activeQuiz, attempts, loading, submitting } = storeToRefs(quizzesStore);
const studySetId = computed(() => String(route.params.id || ""));
const latestAttempt = ref(null);
const answers = reactive({});
const generatorForm = reactive({
  title: "",
  questionCount: 10,
  questionTypes: ["mcq", "true_false", "fill_blank"]
});

const studySetTitle = computed(() => {
  const target = studySetsStore.items.find((item) => item.id === studySetId.value);
  return target?.title || studySetId.value;
});

function questionTypeLabel(questionType) {
  if (questionType === "mcq") {
    return "单选题";
  }
  if (questionType === "true_false") {
    return "判断题";
  }
  return "填空题";
}

function resetAnswers(quiz) {
  for (const key of Object.keys(answers)) {
    delete answers[key];
  }

  for (const question of quiz?.questions || []) {
    if (question.questionType === "mcq") {
      answers[question.id] = { optionId: "" };
      continue;
    }
    if (question.questionType === "true_false") {
      answers[question.id] = { value: null };
      continue;
    }
    answers[question.id] = { text: "" };
  }
}

async function ensureStudySetLoaded() {
  if (!studySetsStore.items.length) {
    await studySetsStore.fetchStudySets();
  }
}

async function loadQuizzes() {
  await quizzesStore.fetchStudySetQuizzes(studySetId.value);
  if (items.value.length) {
    await selectQuiz(items.value[0].id);
  } else {
    quizzesStore.clearActiveQuiz();
    latestAttempt.value = null;
  }
}

async function selectQuiz(quizId) {
  try {
    const quiz = await quizzesStore.fetchQuizDetail(quizId);
    resetAnswers(quiz);
    await reloadAttempts();
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "读取测验失败");
  }
}

async function reloadAttempts() {
  if (!activeQuiz.value?.id) {
    return;
  }

  try {
    const result = await quizzesStore.fetchQuizAttempts(activeQuiz.value.id);
    latestAttempt.value = result[0] || null;
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "读取测验记录失败");
  }
}

async function handleGenerateQuiz() {
  if (!generatorForm.questionTypes.length) {
    ElMessage.warning("至少选择一种题型");
    return;
  }

  try {
    const quiz = await quizzesStore.generateQuiz({
      studySetId: studySetId.value,
      title: generatorForm.title.trim(),
      questionCount: generatorForm.questionCount,
      questionTypes: generatorForm.questionTypes
    });
    resetAnswers(quiz);
    latestAttempt.value = null;
    await quizzesStore.fetchStudySetQuizzes(studySetId.value);
    ElMessage.success("测验已生成");
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "生成测验失败");
  }
}

function buildAttemptPayload() {
  return {
    answers: (activeQuiz.value?.questions || []).map((question) => ({
      questionId: question.id,
      answer: answers[question.id] || {}
    }))
  };
}

async function handleSubmitAttempt() {
  if (!activeQuiz.value?.id) {
    return;
  }

  try {
    const attempt = await quizzesStore.submitQuizAttempt(activeQuiz.value.id, buildAttemptPayload());
    latestAttempt.value = attempt;
    await quizzesStore.fetchStudySetQuizzes(studySetId.value);
    ElMessage.success("测验已提交");
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "提交测验失败");
  }
}

function restartQuiz() {
  if (!activeQuiz.value) {
    return;
  }
  resetAnswers(activeQuiz.value);
  ElMessage.success("已重置当前测验作答");
}

async function retryWrongOnly() {
  if (!activeQuiz.value?.id) {
    return;
  }

  try {
    const quiz = await quizzesStore.retryQuiz(activeQuiz.value.id, { mode: "wrong_only" });
    resetAnswers(quiz);
    latestAttempt.value = null;
    await quizzesStore.fetchStudySetQuizzes(studySetId.value);
    ElMessage.success("已生成错题再测");
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || "生成错题再测失败");
  }
}

function goFlashcards() {
  router.push({ name: "study-set-flashcards", params: { id: studySetId.value } });
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
  await loadQuizzes();
});
</script>

<style scoped>
.quiz-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quiz-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.quiz-page__header h2 {
  margin: 0;
}

.quiz-page__header p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.quiz-page__header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quiz-page__layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
}

.quiz-page__sidebar,
.quiz-page__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quiz-page__panel {
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  background: var(--bg-overlay-strong);
  padding: 18px;
}

.quiz-page__panel h3 {
  margin: 0;
}

.quiz-page__panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.quiz-page__panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quiz-page__panel-head p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.quiz-page__empty {
  color: var(--text-secondary);
}

.quiz-page__quiz-list,
.quiz-page__question-list,
.quiz-page__attempt-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-page__quiz-item {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border-primary);
  background: var(--bg-surface-alt);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-primary);
  cursor: pointer;
}

.quiz-page__quiz-item--active {
  box-shadow: inset 0 0 0 2px rgba(14, 165, 233, 0.3);
}

.quiz-page__quiz-item span {
  color: var(--text-secondary);
  font-size: 12px;
}

.quiz-page__question {
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  padding: 14px;
  background: var(--bg-surface-alt);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-page__question-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quiz-page__prompt {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
}

.quiz-page__options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiz-page__submit {
  margin-top: 16px;
}

.quiz-page__attempt-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-surface-alt);
}

.quiz-page__attempt-item p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

@media (max-width: 1100px) {
  .quiz-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .quiz-page__header,
  .quiz-page__panel-head,
  .quiz-page__question-head,
  .quiz-page__attempt-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
