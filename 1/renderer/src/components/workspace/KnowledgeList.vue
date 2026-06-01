<template>
  <div>
    <div class="page-header">
      <div>
        <h1>知识库中心</h1>
        <p>导入学习资料后，聊天页会把这些文档元信息带给模型。</p>
      </div>

      <div class="page-actions">
        <button type="button" class="primary-button" :disabled="importing" @click="$emit('import')">
          导入本地文档
        </button>
        <button type="button" class="secondary-button" :disabled="importing" @click="$emit('clear')">
          清空知识库
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="surface-card stats-card">
        <p>文档总数</p>
        <strong>{{ stats.totalCount }}</strong>
      </div>
      <div class="surface-card stats-card">
        <p>累计大小</p>
        <strong>{{ stats.totalSize }}</strong>
      </div>
      <div class="surface-card stats-card">
        <p>最近导入</p>
        <strong class="stats-card__truncate">{{ stats.latestName }}</strong>
      </div>
    </div>

    <div class="surface-card toolbar-card">
      <div class="toolbar-search">
        <span class="toolbar-search__icon">
          <svg viewBox="0 0 24 24" class="search-icon">
            <path
              d="M10.5 4.5a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm0-1.5a7.5 7.5 0 1 0 4.73 13.32l3.22 3.21a.75.75 0 1 0 1.06-1.06l-3.21-3.22A7.5 7.5 0 0 0 10.5 3Z"
            />
          </svg>
        </span>
        <input :value="search" type="text" class="search-input" placeholder="搜索文档名称" @input="$emit('update:search', $event.target.value.trim())" />
      </div>
      <div class="toolbar-summary">{{ summaryText }}</div>
    </div>

    <div v-if="!documents.length" class="surface-card kb-empty">
      <div class="kb-empty__icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path :d="folderOpenIconPath" />
        </svg>
      </div>
      <h3>还没有学习资料</h3>
      <p>支持导入 PDF、Word、Markdown、TXT、PPT、CSV 等常见格式。</p>
    </div>

    <div v-else class="document-grid">
      <article v-for="doc in documents" :key="doc.id" class="surface-card document-card">
        <div class="document-card__top">
          <div class="document-type-badge">{{ doc.sourceType.toUpperCase() }}</div>
          <button type="button" class="document-delete" title="删除文档" @click="$emit('delete', doc.id)">
            删除
          </button>
        </div>
        <h3>{{ doc.name }}</h3>
        <p>{{ doc.summary || "已登记到知识库，可在聊天页直接引用。" }}</p>
        <div class="document-card__meta">
          <span>{{ doc.knowledgeBaseName || "默认知识库" }}</span>
          <span>{{ formatSize(doc.sizeBytes) }}</span>
          <span>{{ formatDate(doc.createdAt) }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    required: true
  },
  search: {
    type: String,
    default: ""
  },
  summaryText: {
    type: String,
    default: ""
  },
  documents: {
    type: Array,
    default: () => []
  },
  importing: {
    type: Boolean,
    default: false
  },
  folderOpenIconPath: {
    type: String,
    required: true
  },
  formatSize: {
    type: Function,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
});

defineEmits(["update:search", "import", "clear", "delete"]);
</script>

<style scoped>
.page-header {
  margin-bottom: 32px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-header p {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.page-actions {
  display: flex;
  gap: 12px;
}

.primary-button,
.secondary-button {
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease-in-out;
}

.primary-button {
  padding: 10px 20px;
  background: var(--brand-blue);
  color: var(--text-inverse);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.15);
}

.primary-button:hover {
  background: var(--brand-blue-hover);
}

.secondary-button {
  padding: 10px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
}

.secondary-button:hover {
  background: var(--bg-surface-hover);
}

.stats-grid {
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.surface-card {
  background: var(--bg-overlay-strong);
  border: 1px solid var(--border-primary);
  backdrop-filter: blur(10px);
}

.stats-card {
  padding: 20px;
  border-radius: 20px;
}

.stats-card p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.stats-card strong {
  display: block;
  margin-top: 12px;
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
}

.stats-card__truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
}

.toolbar-card {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar-search {
  position: relative;
  flex: 1;
}

.toolbar-search__icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #c8d6ec;
}

.search-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
  filter: drop-shadow(0 0 8px rgba(146, 183, 255, 0.14));
}

.search-input {
  width: 100%;
  border: 1px solid var(--border-input);
  border-radius: 14px;
  background: var(--bg-input);
  padding: 12px 16px 12px 44px;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

.toolbar-summary {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.kb-empty {
  padding: 56px;
  border: 2px dashed var(--border-primary);
  border-radius: 24px;
  text-align: center;
  color: var(--text-secondary);
}

.kb-empty__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--brand-blue-light);
  color: #eef5ff;
  box-shadow: 0 0 24px rgba(146, 183, 255, 0.14);
}

.kb-empty__icon svg {
  width: 28px;
  height: 28px;
  fill: currentColor;
}

.kb-empty h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.kb-empty p {
  margin: 8px 0 0;
  font-size: 14px;
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.document-card {
  padding: 20px;
  border-radius: 24px;
}

.document-card__top {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.document-type-badge {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: var(--brand-blue-light);
  color: #eef5ff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 0 18px rgba(146, 183, 255, 0.12);
}

.document-delete {
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 13px;
  cursor: pointer;
}

.document-delete:hover {
  color: #ef4444;
}

.document-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-all;
}

.document-card p {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.document-card__meta {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .page-header,
  .toolbar-card,
  .document-card__meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
