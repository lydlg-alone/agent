import { defineStore } from "pinia";
import {
  fetchQuizAttempts as fetchQuizAttemptsApi,
  fetchQuizDetail as fetchQuizDetailApi,
  fetchStudySetQuizzes as fetchStudySetQuizzesApi,
  generateQuiz as generateQuizApi,
  retryQuiz as retryQuizApi,
  submitQuizAttempt as submitQuizAttemptApi
} from "@/services/api.js";

export const useQuizzesStore = defineStore("quizzes", {
  state: () => ({
    items: [],
    activeQuiz: null,
    attempts: [],
    loading: false,
    submitting: false
  }),

  actions: {
    async fetchStudySetQuizzes(studySetId) {
      this.loading = true;
      try {
        this.items = await fetchStudySetQuizzesApi(studySetId);
      } finally {
        this.loading = false;
      }
      return this.items;
    },

    async fetchQuizDetail(quizId) {
      this.loading = true;
      try {
        this.activeQuiz = await fetchQuizDetailApi(quizId);
      } finally {
        this.loading = false;
      }
      return this.activeQuiz;
    },

    async generateQuiz(payload) {
      this.submitting = true;
      try {
        const created = await generateQuizApi(payload);
        this.activeQuiz = created;
        this.items = [created, ...this.items.filter((item) => item.id !== created.id)];
        return created;
      } finally {
        this.submitting = false;
      }
    },

    async submitQuizAttempt(quizId, payload) {
      this.submitting = true;
      try {
        const attempt = await submitQuizAttemptApi(quizId, payload);
        this.attempts = [attempt, ...this.attempts];
        return attempt;
      } finally {
        this.submitting = false;
      }
    },

    async retryQuiz(quizId, payload) {
      this.submitting = true;
      try {
        const created = await retryQuizApi(quizId, payload);
        this.activeQuiz = created;
        this.attempts = [];
        this.items = [created, ...this.items.filter((item) => item.id !== created.id)];
        return created;
      } finally {
        this.submitting = false;
      }
    },

    async fetchQuizAttempts(quizId) {
      this.loading = true;
      try {
        this.attempts = await fetchQuizAttemptsApi(quizId);
      } finally {
        this.loading = false;
      }
      return this.attempts;
    },

    clearActiveQuiz() {
      this.activeQuiz = null;
      this.attempts = [];
    }
  }
});
