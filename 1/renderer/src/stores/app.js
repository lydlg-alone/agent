import { defineStore } from "pinia";
import { api } from "@/services/api.js";

export const useAppStore = defineStore("app", {
  state: () => ({
    summary: null,
    loading: false
  }),
  actions: {
    async loadSummary() {
      this.loading = true;
      try {
        const { data } = await api.get("/dashboard/summary");
        this.summary = data;
      } finally {
        this.loading = false;
      }
    }
  }
});
