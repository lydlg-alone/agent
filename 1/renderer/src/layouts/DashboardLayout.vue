<template>
  <div class="dashboard-layout">
    <aside class="dashboard-layout__sidebar">
      <div class="dashboard-layout__brand">Studyield</div>
      <nav class="dashboard-layout__nav">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <section class="dashboard-layout__content" :class="{ 'dashboard-layout__content--chat': isChatPage }">
      <header v-if="!isChatPage" class="dashboard-layout__topbar">
        <h1>{{ currentTitle }}</h1>
      </header>

      <main class="dashboard-layout__main" :class="{ 'dashboard-layout__main--chat': isChatPage }">
        <RouterView />
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const navItems = [
  { label: "控制台", to: "/dashboard/home" },
  { label: "AI 对话", to: "/dashboard/chat" },
  { label: "学习集", to: "/dashboard/study-sets" },
  { label: "知识库", to: "/dashboard/knowledge-base" },
  { label: "学习分析", to: "/dashboard/analytics" },
  { label: "设置", to: "/dashboard/settings" }
];

const currentTitle = computed(() => route.meta?.title || "控制台");
const isChatPage = computed(() => route.name === "chat");
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 220px 1fr;
  color: var(--text-primary);
}

.dashboard-layout__sidebar {
  border-right: 1px solid var(--border-primary);
  background: var(--bg-overlay-strong);
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dashboard-layout__brand {
  padding: 0 10px;
  font-size: 18px;
  font-weight: 700;
}

.dashboard-layout__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dashboard-layout__nav a {
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 10px;
  border-radius: 10px;
}

.dashboard-layout__nav a.router-link-active {
  color: var(--text-primary);
  background: var(--bg-surface-alt);
  font-weight: 600;
}

.dashboard-layout__content {
  min-width: 0;
  display: grid;
  grid-template-rows: auto 1fr;
}

.dashboard-layout__content--chat {
  grid-template-rows: 1fr;
}

.dashboard-layout__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-overlay-strong);
}

.dashboard-layout__topbar h1 {
  margin: 0;
  font-size: 20px;
}

.dashboard-layout__main {
  padding: 20px;
  min-height: 0;
}

.dashboard-layout__main--chat {
  padding: 0;
}

@media (max-width: 960px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .dashboard-layout__sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--border-primary);
  }

  .dashboard-layout__nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
