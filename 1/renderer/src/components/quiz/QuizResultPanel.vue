<template>
  <section class="quiz-result-panel">
    <header class="quiz-result-panel__header">
      <div>
        <h3>本次结果</h3>
        <p>提交时间：{{ formatDateTime(attempt?.submittedAt) }}</p>
      </div>
      <div class="quiz-result-panel__score">
        <strong>{{ scoreText }}</strong>
        <span>{{ attempt?.correctCount || 0 }} / {{ attempt?.totalCount || 0 }}</span>
      </div>
    </header>

    <div v-if="attempt?.results?.length" class="quiz-result-panel__list">
      <article
        v-for="(item, index) in attempt.results"
        :key="item.questionId"
        class="quiz-result-panel__item"
        :class="item.isCorrect ? 'quiz-result-panel__item--correct' : 'quiz-result-panel__item--wrong'"
      >
        <div class="quiz-result-panel__item-head">
          <strong>第 {{ index + 1 }} 题</strong>
          <span>{{ item.isCorrect ? "回答正确" : "回答错误" }}</span>
        </div>
        <p class="quiz-result-panel__prompt">{{ item.promptText }}</p>
        <p>你的答案：{{ formatAnswer(item.questionType, item.userAnswer, item.options) }}</p>
        <p>正确答案：{{ formatAnswer(item.questionType, item.correctAnswer, item.options) }}</p>
        <p class="quiz-result-panel__explanation">{{ item.explanationText || "暂无解析" }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  attempt: {
    type: Object,
    default: null
  }
});

const scoreText = computed(() => `${Number(props.attempt?.score || 0).toFixed(0)} 分`);

function formatAnswer(questionType, answer, options = []) {
  if (!answer) {
    return "-";
  }

  if (questionType === "mcq") {
    const option = options.find((item) => item.id === answer.optionId);
    return option?.text || answer.text || "-";
  }

  if (questionType === "true_false") {
    return answer.value ? "正确" : "错误";
  }

  if (questionType === "fill_blank") {
    if (Array.isArray(answer.answers)) {
      return answer.answers.join(" / ") || "-";
    }
    return answer.text || "-";
  }

  return JSON.stringify(answer);
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
</script>

<style scoped>
.quiz-result-panel {
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 18px;
  background: var(--bg-overlay-strong);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quiz-result-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.quiz-result-panel__header h3 {
  margin: 0;
}

.quiz-result-panel__header p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.quiz-result-panel__score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.quiz-result-panel__score strong {
  font-size: 28px;
}

.quiz-result-panel__score span {
  color: var(--text-secondary);
}

.quiz-result-panel__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-result-panel__item {
  border-radius: 12px;
  padding: 14px;
  border: 1px solid var(--border-primary);
  background: var(--bg-surface-alt);
}

.quiz-result-panel__item--correct {
  box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.25);
}

.quiz-result-panel__item--wrong {
  box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.2);
}

.quiz-result-panel__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quiz-result-panel__prompt {
  white-space: pre-wrap;
  line-height: 1.6;
}

.quiz-result-panel__explanation {
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .quiz-result-panel__header,
  .quiz-result-panel__item-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .quiz-result-panel__score {
    align-items: flex-start;
  }
}
</style>
