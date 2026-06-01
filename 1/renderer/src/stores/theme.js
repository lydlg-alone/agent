import { defineStore } from "pinia";

const STORAGE_KEY = "ai-study-theme-mode";

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "glacier" || stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable; fall back to glacier
  }
  return "glacier";
}

function resolveMode(mode) {
  return "glacier";
}

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: readStoredMode()
  }),

  getters: {
    resolved(state) {
      return resolveMode(state.mode);
    },
    isDark(state) {
      return resolveMode(state.mode) === "dark";
    }
  },

  actions: {
    apply() {
      document.documentElement.setAttribute("data-theme", this.resolved);
    },

    setMode(nextMode) {
      if (!["glacier", "light", "dark", "system"].includes(nextMode)) {
        return;
      }
      this.mode = nextMode;
      try {
        localStorage.setItem(STORAGE_KEY, nextMode);
      } catch {
        // silent
      }
      this.apply();
    },

    toggle() {
      this.setMode("glacier");
    },

    init() {
      this.apply();

      try {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = () => {
          if (this.mode === "system") {
            this.apply();
          }
        };
        if (typeof mq.addEventListener === "function") {
          mq.addEventListener("change", listener);
        } else if (typeof mq.addListener === "function") {
          mq.addListener(listener);
        }
      } catch {
        // matchMedia unavailable
      }
    }
  }
});
