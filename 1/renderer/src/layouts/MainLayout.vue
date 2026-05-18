<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="brand-block">
        <span class="brand-block__eyebrow">AI Learning Desktop</span>
        <h1>多智能体学习系统</h1>
        <p>围绕对话、检索、规划、生成、练习和反馈构建本地化学习闭环。</p>
      </div>

      <nav class="nav-list">
        <RouterLink v-for="item in navItems" :key="item.to" class="nav-item" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <main class="app-main">
      <header class="top-banner">
        <div>
          <span class="banner-tag">Desktop Workspace</span>
          <h2>可扩展的大模型学习协同工作台</h2>
        </div>
        <div class="runtime-panel">
          <span>Platform: {{ platform }}</span>
          <span>API: {{ apiBase }}</span>
        </div>
      </header>

      <RouterView />
    </main>
  </div>
</template>

<script setup>
const navItems = [
  { label: "聊天空间", to: "/" },
  { label: "总览", to: "/dashboard" },
  { label: "模型配置", to: "/models" },
  { label: "知识库管理", to: "/knowledge" },
  { label: "智能体编排", to: "/agents" },
  { label: "学习资源生成", to: "/learning" },
  { label: "练习与测评", to: "/practice" },
  { label: "数据可视化", to: "/analytics" }
];

const platform = window.desktopBridge?.platform || "browser";
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001/api";
</script>
