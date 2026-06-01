<template>
  <div class="dash-shell">
    <!-- Side Nav — matches StudyWorkspaceView side-nav -->
    <nav class="side-nav">
      <RouterLink to="/" class="brand-mark" aria-label="首页">
        <svg viewBox="0 0 24 24" class="nav-icon nav-icon--brand">
          <path d="M9.5 3.75c-2.35 0-4.25 1.9-4.25 4.25v1.03a3.25 3.25 0 0 0-.97 5.53A4.25 4.25 0 0 0 8.5 21h1.75A2 2 0 0 0 12 19.97A2 2 0 0 0 13.75 21h1.75a4.25 4.25 0 0 0 4.22-3.44a3.25 3.25 0 0 0-.97-5.53V8c0-2.35-1.9-4.25-4.25-4.25c-1.1 0-2.1.41-2.87 1.08A4.23 4.23 0 0 0 9.5 3.75ZM9 8.25c.41 0 .75.34.75.75v6a.75.75 0 0 1-1.5 0V9c0-.41.34-.75.75-.75Zm6 0c.41 0 .75.34.75.75v6a.75.75 0 0 1-1.5 0V9c0-.41.34-.75.75-.75ZM12 6.75c.41 0 .75.34.75.75v9a.75.75 0 0 1-1.5 0v-9c0-.41.34-.75.75-.75Z" />
        </svg>
      </RouterLink>

      <RouterLink
        v-for="item in navItems"
        :key="item.key"
        :to="item.to"
        class="nav-button"
        :class="{ 'nav-button--active': isActive(item) }"
        :title="item.label"
      >
        <svg viewBox="0 0 24 24" class="nav-icon">
          <path :d="item.iconPath" />
        </svg>
      </RouterLink>

      <div class="side-nav__spacer"></div>

      <RouterLink
        :to="settingsItem.to"
        class="nav-button"
        :class="{ 'nav-button--active': isActive(settingsItem) }"
        :title="settingsItem.label"
      >
        <svg viewBox="0 0 24 24" class="nav-icon">
          <path :d="settingsItem.iconPath" />
        </svg>
      </RouterLink>
    </nav>

    <!-- Main Content — matches workspace-main -->
    <div class="workspace-main">
      <RouterView />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, RouterLink } from "vue-router";

const route = useRoute();

const iconPaths = {
  home: "M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z M12 5.432l6.75 6.75V19.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5h-3v4.5a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-7.318L12 5.432Z",
  book: "M6 3.75A2.25 2.25 0 0 0 3.75 6v11.25c0 1.24 1.01 2.25 2.25 2.25h12a.75.75 0 0 0 .75-.75V6A2.25 2.25 0 0 0 16.5 3.75H6Zm1.5 2.25h7.5a.75.75 0 0 1 0 1.5H7.5a.75.75 0 0 1 0-1.5Zm0 3.75h7.5a.75.75 0 0 1 0 1.5H7.5a.75.75 0 0 1 0-1.5Z",
  chat: "M4.5 5.25A2.25 2.25 0 0 1 6.75 3h10.5a2.25 2.25 0 0 1 2.25 2.25v8.25a2.25 2.25 0 0 1-2.25 2.25H10.7l-3.98 3.1A.75.75 0 0 1 5.5 18.2v-2.45A2.25 2.25 0 0 1 3.75 13.5V5.25A.75.75 0 0 1 4.5 5.25Z",
  chart: "M3 13.5a.75.75 0 0 1 .75.75V18a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 0-1.5H6v-3a.75.75 0 0 1 1.5 0v3h1.5v-5.25a.75.75 0 0 1 1.5 0v5.25H12v-8.25a.75.75 0 0 1 1.5 0v8.25h1.5v-3.75a.75.75 0 0 1 1.5 0v3.75H18a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 1 1.5 0V18A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-3.75A.75.75 0 0 1 3 13.5Z",
  folder: "M2.25 6A2.25 2.25 0 0 1 4.5 3.75h4.03c.6 0 1.17.24 1.6.66l1.44 1.44c.14.14.33.22.53.22H19.5A2.25 2.25 0 0 1 21.75 8.3v7.2a2.25 2.25 0 0 1-2.25 2.25H5.12a2.25 2.25 0 0 1-2.17-2.84l1.52-5.47a2.25 2.25 0 0 1 2.17-1.66h12.62a.75.75 0 0 1 .72.95l-1.38 4.97a1.5 1.5 0 0 1-1.45 1.1H7.88a.75.75 0 0 0 0 1.5h8.7a2.25 2.25 0 0 0 2.17-1.66l1-3.59H6.63a.75.75 0 0 0-.72.55l-1.52 5.47a.75.75 0 0 0 .72.95H19.5a.75.75 0 0 0 .75-.75V8.3a.75.75 0 0 0-.75-.75H12.1a2.23 2.23 0 0 1-1.6-.66L9.05 5.45a.75.75 0 0 0-.52-.2H4.5A.75.75 0 0 0 3.75 6v.75h-1.5V6Z",
  map: "M8.25 3.75a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0v-4.5Zm6 0a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0v-4.5ZM12 2.25a.75.75 0 0 1 .75.75v1.5h-1.5V3a.75.75 0 0 1 .75-.75ZM6.75 9a.75.75 0 0 1 .75.75v1.5h-1.5v-1.5A.75.75 0 0 1 6.75 9Zm10.5 0a.75.75 0 0 1 .75.75v1.5h-1.5v-1.5a.75.75 0 0 1 .75-.75Zm-7.5 3.75a.75.75 0 0 1 .75.75v1.5H9v-1.5a.75.75 0 0 1 .75-.75Zm4.5 0a.75.75 0 0 1 .75.75v1.5h-1.5v-1.5a.75.75 0 0 1 .75-.75ZM3.75 15a.75.75 0 0 1 .75.75v1.5H3v-1.5a.75.75 0 0 1 .75-.75Zm16.5 0a.75.75 0 0 1 .75.75v1.5h-1.5v-1.5a.75.75 0 0 1 .75-.75ZM6 19.5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 19.5Z",
  settings: "M10.6 1.84a1 1 0 0 1 2.8 0l.23.87c.12.44.52.73.98.75c.52.02 1.03.12 1.51.3c.43.16.91.06 1.21-.27l.64-.68a1 1 0 0 1 2.42 1.4l-.45.78c-.23.4-.19.89.07 1.26c.3.42.53.89.68 1.39c.14.45.52.77.99.79l.97.04a1 1 0 0 1 .87 1.78l-.74.52c-.39.27-.56.75-.45 1.21c.06.25.09.51.09.77s-.03.52-.09.77c-.11.46.06.94.45 1.21l.74.52a1 1 0 0 1-.87 1.78l-.97.04c-.47.02-.85.34-.99.79c-.15.5-.38.97-.68 1.39c-.26.37-.3.86-.07 1.26l.45.78a1 1 0 0 1-1.62 1.18l-.64-.68c-.3-.33-.78-.43-1.21-.27c-.48.18-.99.28-1.51.3c-.46.02-.86.31-.98.75l-.23.87a1 1 0 0 1-2.8 0l-.23-.87c-.12-.44-.52-.73-.98-.75a5.6 5.6 0 0 1-1.51-.3c-.43-.16-.91-.06-1.21.27l-.64.68a1 1 0 0 1-1.62-1.18l.45-.78c.23-.4.19-.89-.07-1.26a5.58 5.58 0 0 1-.68-1.39a1.07 1.07 0 0 0-.99-.79l-.97-.04a1 1 0 0 1-.87-1.78l.74-.52c.39-.27.56-.75.45-1.21A3.4 3.4 0 0 1 5 12c0-.26.03-.52.09-.77c.11-.46-.06-.94-.45-1.21l-.74-.52a1 1 0 0 1 .87-1.78l.97-.04c.47-.02.85-.34.99-.79c.15-.5.38-.97.68-1.39c.26-.37.3-.86.07-1.26l-.45-.78a1 1 0 0 1 1.62-1.18l.64.68c.3.33.78.43 1.21.27c.48-.18.99-.28 1.51-.3c.46-.02.86-.31.98-.75l.23-.87ZM12 8.25A3.75 3.75 0 1 0 12 15.75A3.75 3.75 0 0 0 12 8.25Z"
};

const navItems = [
  { key: "overview", label: "总览", to: "/dashboard/home", iconPath: iconPaths.home },
  { key: "study-sets", label: "学习集", to: "/dashboard/study-sets", iconPath: iconPaths.book },
  { key: "chat", label: "AI 对话", to: "/dashboard/chat", iconPath: iconPaths.chat },
  { key: "knowledge", label: "知识库", to: "/dashboard/knowledge-base", iconPath: iconPaths.folder },
  { key: "analytics", label: "学习分析", to: "/dashboard/analytics", iconPath: iconPaths.chart },
  { key: "paths", label: "学习路径", to: "/dashboard/learning-paths", iconPath: iconPaths.map }
];

const settingsItem = { key: "settings", label: "设置", to: "/dashboard/settings", iconPath: iconPaths.settings };

function isActive(item) {
  if (item.key === "overview") return route.name === "dashboard-home";
  return route.path.startsWith(item.to);
}
</script>

<style scoped>
/* ======== Shell (matches study-shell) ======== */
.dash-shell {
  min-height: 100vh;
  display: flex;
  color: var(--text-primary);
}

/* ======== Side Nav (exact copy of StudyWorkspaceView side-nav) ======== */
.side-nav {
  width: 72px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 0;
  background: rgba(15, 32, 54, 0.94);
  border-right: 1px solid rgba(84, 178, 230, 0.32);
  z-index: 10;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 8px;
  text-decoration: none;
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(126, 178, 209, 0.82);
  text-decoration: none;
  transition: background 0.16s, color 0.16s;
}

.nav-button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(210, 236, 252, 0.94);
}

.nav-button--active {
  background: rgba(14, 165, 233, 0.22);
  color: #7dd3fc;
}

.nav-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.nav-icon--brand {
  fill: #7dd3fc;
}

.side-nav__spacer {
  flex: 1;
}

/* ======== Main Content ======== */
.workspace-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background:
    radial-gradient(circle at 16% 12%, rgba(186, 230, 253, 0.36), transparent 26%),
    radial-gradient(circle at 78% 10%, rgba(219, 234, 254, 0.38), transparent 28%),
    linear-gradient(180deg, #f8fcff 0%, #edf7ff 48%, #e4f2fb 100%);
}

@media (max-width: 640px) {
  .side-nav {
    width: 56px;
  }

  .nav-button {
    width: 40px;
    height: 40px;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
  }
}
</style>
