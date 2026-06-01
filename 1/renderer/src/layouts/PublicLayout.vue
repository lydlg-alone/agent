<template>
  <div class="public-layout">
    <header class="public-layout__header">
      <RouterLink to="/dashboard/chat" class="public-layout__brand">Studyield</RouterLink>

      <nav class="public-layout__nav">
        <RouterLink to="/welcome">功能预览</RouterLink>

        <!-- Authed -->
        <template v-if="userStore.isLoggedIn">
          <span class="public-layout__user">{{ userStore.userName }}</span>
          <RouterLink to="/dashboard/chat" class="public-layout__nav-cta">控制台</RouterLink>
        </template>

        <!-- Not authed -->
        <template v-else>
          <RouterLink to="/login">登录</RouterLink>
          <RouterLink to="/signup" class="public-layout__nav-cta">免费注册</RouterLink>
        </template>
      </nav>
    </header>

    <main class="public-layout__main">
      <RouterView />
    </main>

    <footer class="public-layout__footer">
      <span>Studyield · AI 驱动的个性化学习平台</span>
      <span class="public-layout__footer-sep">|</span>
      <span>数据本地存储 · 安全可控</span>
    </footer>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router";
import { useUserStore } from "@/stores/user.js";

const userStore = useUserStore();
</script>

<style scoped>
.public-layout {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  color: var(--text-primary);
}

.public-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 28px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-overlay-strong);
  backdrop-filter: blur(12px);
}

.public-layout__brand {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  text-decoration: none;
  letter-spacing: -0.3px;
}

.public-layout__nav {
  display: flex;
  align-items: center;
  gap: 18px;
}

.public-layout__nav a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s;
}

.public-layout__nav a:hover {
  color: var(--text-primary);
}

.public-layout__nav a.router-link-active {
  color: var(--text-primary);
  font-weight: 600;
}

.public-layout__nav-cta {
  padding: 7px 18px !important;
  border-radius: 10px;
  color: var(--text-inverse) !important;
  background: var(--brand-blue);
  font-weight: 600 !important;
  transition: background 0.2s, transform 0.12s !important;
}

.public-layout__nav-cta:hover {
  background: var(--brand-blue-hover) !important;
  color: var(--text-inverse) !important;
  transform: translateY(-1px);
}

.public-layout__nav-cta.router-link-active {
  background: var(--brand-blue);
  color: var(--text-inverse) !important;
}

.public-layout__user {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}

.public-layout__main {
  padding: 20px 24px 28px;
}

.public-layout__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-top: 1px solid var(--border-primary);
  padding: 14px 24px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.public-layout__footer-sep {
  opacity: 0.4;
}

@media (max-width: 640px) {
  .public-layout__header {
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
  }

  .public-layout__nav {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
}
</style>
