import { defineStore } from "pinia";

const STORAGE_KEY = "ai-study-theme-mode";

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable — fall back to system
  }
  return "system";
}

function resolveMode(mode) {
  if (mode === "system") {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  }
  return mode;
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
      if (!["light", "dark", "system"].includes(nextMode)) {
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
      this.setMode(this.resolved === "dark" ? "light" : "dark");
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
        // modern browsers
        if (typeof mq.addEventListener === "function") {
          mq.addEventListener("change", listener);
        } else if (typeof mq.addListener === "function") {
          mq.addListener(listener);
        }
      } catch {
        // matchMedia unavailable — nothing to watch
      }
    }
  }
});
