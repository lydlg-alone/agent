import { defineStore } from "pinia";
import {
  createStudySet as createStudySetApi,
  deleteStudySet as deleteStudySetApi,
  fetchStudySetDetail,
  fetchStudySets as fetchStudySetsApi,
  updateStudySet as updateStudySetApi
} from "@/services/api.js";

export const useStudySetsStore = defineStore("studySets", {
  state: () => ({
    items: [],
    loading: false
  }),

  actions: {
    async fetchStudySets(params = {}) {
      this.loading = true;
      try {
        this.items = await fetchStudySetsApi(params);
      } finally {
        this.loading = false;
      }
      return this.items;
    },

    async fetchStudySet(id) {
      return fetchStudySetDetail(id);
    },

    async createStudySet(payload) {
      const created = await createStudySetApi(payload);
      this.items = [created, ...this.items];
      return created;
    },

    async updateStudySet(id, payload) {
      const updated = await updateStudySetApi(id, payload);
      this.items = this.items.map((item) => (item.id === id ? updated : item));
      return updated;
    },

    async deleteStudySet(id) {
      await deleteStudySetApi(id);
      this.items = this.items.filter((item) => item.id !== id);
    }
  }
});
