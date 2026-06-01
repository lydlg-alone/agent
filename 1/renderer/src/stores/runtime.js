import { defineStore } from "pinia";

function normalizeBaseUrlDisplay(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

export function createEmptyRuntimeDraft() {
  return {
    provider: "",
    baseUrl: "",
    apiKey: "",
    apiKeyMasked: "",
    systemPrompt: "",
    modelId: "",
    storageDirectory: "",
    storagePath: ""
  };
}

export const useRuntimeStore = defineStore("runtime", {
  state: () => ({
    provider: "",
    baseUrl: "",
    apiKeyMasked: "",
    hasApiKey: false,
    systemPrompt: "",
    modelId: "",
    storageDirectory: "",
    storagePath: "",
    currentModel: null
  }),
  getters: {
    normalizedBaseUrl: (state) => normalizeBaseUrlDisplay(state.baseUrl),
    apiConfigured(state) {
      return Boolean(state.baseUrl && (state.hasApiKey || state.apiKeyMasked));
    },
    currentModelPillText(state) {
      return state.modelId || state.currentModel?.modelId || "自动识别";
    },
    chatSubtitleText() {
      return this.normalizedBaseUrl ? `已连接 ${this.normalizedBaseUrl}` : "当前使用本地模拟服务";
    },
    chatStatusText() {
      return this.apiConfigured
        ? "已配置直连 API，发送消息会请求真实模型"
        : "未连接真实模型，当前使用本地模拟回复";
    },
    runtimeStatusText() {
      return this.apiConfigured
        ? "已检测到 API 配置，页面会优先调用外部 AI 接口。"
        : "尚未填写 API Base URL 或 API Key，当前为本地演示模式。";
    },
    settingsRuntimeStatusText() {
      const lines = [this.runtimeStatusText];
      if (this.provider || this.currentModel?.provider) {
        lines.push(`当前 Provider：${this.provider || this.currentModel?.provider}`);
      }
      if (this.modelId || this.currentModel?.modelId) {
        lines.push(`当前模型：${this.modelId || this.currentModel?.modelId}`);
      }
      return lines.join(" ");
    },
    settingsModelHelpText() {
      return this.currentModelPillText !== "自动识别"
        ? `当前已识别模型：${this.currentModelPillText}`
        : "不再手动选择模型，页面会从当前 AI 服务自动读取。";
    },
    settingsStorageText(state) {
      return state.storagePath
        ? `配置文件位置：${state.storagePath}`
        : "配置将保存在系统文档目录下的 agent API 文件夹。";
    }
  },
  actions: {
    applyPayload(payload = {}) {
      const runtime = payload.settings || payload || {};

      this.provider = runtime.provider || payload?.currentModel?.provider || "";
      this.baseUrl = runtime.baseUrl || "";
      this.apiKeyMasked = runtime.apiKeyMasked || "";
      this.hasApiKey = Boolean(runtime.hasApiKey || runtime.apiKeyMasked);
      this.systemPrompt = runtime.systemPrompt || "";
      this.modelId = runtime.modelId || payload?.currentModel?.modelId || "";
      this.storageDirectory = runtime.storageDirectory || "";
      this.storagePath = runtime.storagePath || "";

      if (Object.prototype.hasOwnProperty.call(payload, "currentModel")) {
        this.currentModel = payload.currentModel || null;
      } else if (runtime.currentModel) {
        this.currentModel = runtime.currentModel;
      }
    },
    setCurrentModel(currentModel) {
      this.currentModel = currentModel || null;
    },
    createDraft() {
      return {
        provider: this.provider,
        baseUrl: this.baseUrl,
        apiKey: "",
        apiKeyMasked: this.apiKeyMasked,
        systemPrompt: this.systemPrompt,
        modelId: this.modelId,
        storageDirectory: this.storageDirectory,
        storagePath: this.storagePath
      };
    }
  }
});
