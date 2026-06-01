import { defineStore } from "pinia";
import {
  createFlashcard as createFlashcardApi,
  deleteFlashcard as deleteFlashcardApi,
  fetchFlashcards as fetchFlashcardsApi,
  reviewFlashcard as reviewFlashcardApi,
  updateFlashcard as updateFlashcardApi
} from "@/services/api.js";

export const useFlashcardsStore = defineStore("flashcards", {
  state: () => ({
    items: [],
    loading: false
  }),

  actions: {
    async fetchFlashcards(studySetId, params = {}) {
      this.loading = true;
      try {
        this.items = await fetchFlashcardsApi(studySetId, params);
      } finally {
        this.loading = false;
      }
      return this.items;
    },

    async createFlashcard(studySetId, payload) {
      const created = await createFlashcardApi(studySetId, payload);
      this.items = [created, ...this.items];
      return created;
    },

    async updateFlashcard(flashcardId, payload) {
      const updated = await updateFlashcardApi(flashcardId, payload);
      this.items = this.items.map((item) => (item.id === flashcardId ? updated : item));
      return updated;
    },

    async deleteFlashcard(flashcardId) {
      await deleteFlashcardApi(flashcardId);
      this.items = this.items.filter((item) => item.id !== flashcardId);
    },

    async reviewFlashcard(flashcardId, quality) {
      const result = await reviewFlashcardApi(flashcardId, quality);
      this.items = this.items.map((item) => (item.id === flashcardId ? result.flashcard : item));
      return result;
    }
  }
});
