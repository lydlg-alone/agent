<template>
  <aside class="status-panel">
    <div class="status-panel__header">
      <h3>协同状态</h3>
      <p>展示模型、知识库和当前智能体状态。</p>
    </div>

    <div class="status-panel__body scrollbar-thin">
      <article v-for="card in cards" :key="card.title" class="surface-card status-card">
        <div class="status-card__head">
          <div class="status-card__icon" :class="card.colorClass">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path :d="card.iconPath" />
            </svg>
          </div>
          <h4>{{ card.title }}</h4>
        </div>
        <p>{{ card.content }}</p>
      </article>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  cards: {
    type: Array,
    default: () => []
  }
});
</script>

<style scoped>
.status-panel {
  display: none;
  flex-direction: column;
  border-left: 1px solid #dbeafe;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(10px);
}

.status-panel__header {
  padding: 24px;
  border-bottom: 1px solid #dbeafe;
}

.status-panel__header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #374151;
}

.status-panel__header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.status-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.surface-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(208, 223, 243, 0.9);
  backdrop-filter: blur(10px);
}

.status-card {
  padding: 16px;
  border-radius: 16px;
}

.status-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-card__head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.status-card__icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.status-card__icon svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.status-card__icon--blue {
  background: #eff6ff;
  color: #2563eb;
}

.status-card__icon--green {
  background: #ecfdf5;
  color: #059669;
}

.status-card__icon--orange {
  background: #fff7ed;
  color: #ea580c;
}

.status-card__icon--slate {
  background: #f1f5f9;
  color: #475569;
}

.status-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #4b5563;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 999px;
}

@media (min-width: 1280px) {
  .status-panel {
    display: flex;
  }
}

@media (max-width: 1279px) {
  .status-panel {
    display: flex;
    border-left: none;
    border-top: 1px solid #dbeafe;
  }
}
</style>
