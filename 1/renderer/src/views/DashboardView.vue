<template>
  <div class="page-stack">
    <SectionBlock title="项目总览" description="对应 README 中的系统定位、总体架构和模块边界。">
      <div class="card-grid">
        <StatusCard label="模型配置数" :value="summary?.counts.models ?? '-'" hint="支持多模型 API 接入" />
        <StatusCard label="知识库数" :value="summary?.counts.knowledgeBases ?? '-'" hint="统一文档处理与检索增强" />
        <StatusCard label="智能体数" :value="summary?.counts.agents ?? '-'" hint="支持多角色编排协同" />
        <StatusCard label="已生成资源" :value="summary?.counts.resources ?? '-'" hint="学习资料和练习沉淀" />
      </div>
    </SectionBlock>

    <SectionBlock title="多智能体工作流" description="从学情诊断到反馈评价的闭环流程。">
      <ol class="flow-list">
        <li v-for="item in summary?.workflow || []" :key="item">{{ item }}</li>
      </ol>
    </SectionBlock>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import SectionBlock from "@/components/SectionBlock.vue";
import StatusCard from "@/components/StatusCard.vue";
import { useAppStore } from "@/stores/app.js";

const appStore = useAppStore();
const summary = computed(() => appStore.summary);

onMounted(() => {
  appStore.loadSummary();
});
</script>
