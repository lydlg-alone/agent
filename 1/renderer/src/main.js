import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";
import App from "./App.vue";
import router from "./router/index.js";
import "./styles/theme.css";
import { useThemeStore } from "./stores/theme.js";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia).use(router).use(ElementPlus).mount("#app");

// 初始化主题（必须在 app mount 之后，确保 document 可用）
const themeStore = useThemeStore();
themeStore.init();
