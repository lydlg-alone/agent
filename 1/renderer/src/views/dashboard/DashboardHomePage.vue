<template>
  <div>
    <div class="page-header">
      <div>
        <h1>{{ greeting }}，{{ userStore.userName || '同学' }}</h1>
        <p>继续你的学习之旅</p>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:28px">
      <div class="stat-card">
        <span class="stat-card__icon">📚</span>
        <div>
          <span class="stat-card__number">{{ studySets.length }}</span>
          <span class="stat-card__label">学习集</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-card__icon">🃏</span>
        <div>
          <span class="stat-card__number">{{ dueCount }}</span>
          <span class="stat-card__label">待复习</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-card__icon">🧠</span>
        <div>
          <span class="stat-card__number">{{ summary?.counts?.knowledgeBases ?? 0 }}</span>
          <span class="stat-card__label">知识库</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-card__icon">🤖</span>
        <div>
          <span class="stat-card__number">{{ summary?.counts?.agents ?? 0 }}</span>
          <span class="stat-card__label">智能体</span>
        </div>
      </div>
    </div>

    <h3 style="margin: 0 0 12px; font-size:16px; font-weight:700">快捷操作</h3>
    <div class="action-grid" style="margin-bottom:28px">
      <RouterLink to="/dashboard/chat" class="action-card">
        <span class="action-card__icon">💬</span>
        <span class="action-card__label">AI 对话</span>
      </RouterLink>
      <RouterLink to="/dashboard/study-sets" class="action-card">
        <span class="action-card__icon">➕</span>
        <span class="action-card__label">新建学习集</span>
      </RouterLink>
      <RouterLink to="/dashboard/knowledge-base" class="action-card">
        <span class="action-card__icon">📁</span>
        <span class="action-card__label">知识库</span>
      </RouterLink>
      <RouterLink to="/dashboard/analytics" class="action-card">
        <span class="action-card__icon">📊</span>
        <span class="action-card__label">学习分析</span>
      </RouterLink>
    </div>

    <div class="card-grid" style="margin-bottom:28px">
      <div class="surface-card">
        <h3 style="margin:0 0 14px; font-size:15px; font-weight:700">最近的学习集</h3>
        <div v-if="!studySets.length" style="text-align:center;padding:24px;color:var(--text-tertiary)">
          还没有学习集，<RouterLink to="/dashboard/study-sets" style="color:var(--brand-blue)">去创建</RouterLink>
        </div>
        <div v-else style="display:flex;flex-direction:column;gap:8px">
          <div v-for="set in studySets.slice(0,5)" :key="set.id"
            style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:12px;background:var(--bg-surface);cursor:pointer"
            @click="$router.push({name:'study-set-detail',params:{id:set.id}})">
            <div>
              <div style="font-weight:600;font-size:14px">{{ set.title }}</div>
              <div style="font-size:12px;color:var(--text-tertiary)">{{ set.examSubject || '无科目' }}</div>
            </div>
            <span style="color:var(--text-tertiary)">→</span>
          </div>
        </div>
      </div>

      <div class="surface-card">
        <h3 style="margin:0 0 14px; font-size:15px; font-weight:700">待复习闪卡</h3>
        <div v-if="!dueCount" style="text-align:center;padding:24px;color:var(--text-tertiary)">🎉 全部掌握！</div>
        <div v-else style="display:flex;flex-direction:column;gap:8px">
          <div v-for="card in dueCards.slice(0,5)" :key="card.id"
            style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:12px;background:var(--bg-surface)">
            <span style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ card.frontText || '(无文本)' }}</span>
            <el-tag size="small">{{ card.status || 'new' }}</el-tag>
          </div>
          <div v-if="dueCount > 5" style="text-align:center;font-size:12px;color:var(--text-tertiary);padding:6px">
            还有 {{ dueCount - 5 }} 张待复习
          </div>
        </div>
      </div>
    </div>

    <div v-if="summary?.workflow" class="surface-card">
      <h3 style="margin:0 0 14px; font-size:15px; font-weight:700">AI 学习工作流</h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        <span v-for="(step,i) in summary.workflow" :key="i"
          style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;background:var(--bg-surface);border:1px solid var(--border-subtle);font-size:13px">
          <span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--brand-blue);color:#fff;font-size:11px;font-weight:700">{{ i+1 }}</span>
          {{ step }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useUserStore } from "@/stores/user.js";
import { useAppStore } from "@/stores/app.js";
import { useStudySetsStore } from "@/stores/studySets.js";
import { api } from "@/services/api.js";

const userStore = useUserStore();
const appStore = useAppStore();
const studySetsStore = useStudySetsStore();

const dueCards = ref([]);
const summary = computed(() => appStore.summary);
const studySets = computed(() => studySetsStore.items);
const dueCount = computed(() => dueCards.value.length);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
});

onMounted(async () => {
  await Promise.all([
    appStore.loadSummary(),
    studySetsStore.fetchStudySets(),
    (async () => {
      try { const { data } = await api.get("/flashcards/due", { params: { limit: 100 } }); dueCards.value = Array.isArray(data) ? data : []; } catch {}
    })()
  ]);
});
</script>

<style scoped>
</style>
